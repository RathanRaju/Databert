"""
Incentivised Milestones - Programme Timeline slide generator (TRU).

Builds a single branded .pptx slide plotting the incentivised programme
milestones as a horizontal timeline. See incentivisedmilestonestimeline.md
for the full method note and the monthly replication steps.

Current build: Period 05.
"""

import re
import sys
from datetime import datetime

import openpyxl
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ---------- Period configuration (update each month) ----------
PERIOD_LABEL = "Period 05"       # used in subtitle, commentary heading, caption
PERIOD_SHORT = "P05"             # used in the per-milestone date lines

SRC_XLSX = "2627_Incentivised_Milestones.xlsx"
SRC_TAB = "Incentivised Milestones."
# Any deck carrying the TRU master/layouts works as the branded base -- either the
# original template or a previously generated slide (its layouts are identical).
TEMPLATE_PPTX = "P04_reference.pptx"
OUT_PPTX = "Incentivised_Milestones_Programme_Timeline_P05.pptx"

# ---------- Source columns ----------
# NOTE: the tracker gains a "Current Finish (P0x)" column each period, which shifts
# everything to its right. Verify these against the header row before each run --
# HEADER_EXPECTATIONS below asserts they still line up and fails loudly if not.
FIRST_ROW, LAST_ROW = 4, 11
COL_AID = 3          # Activity ID (Lvl 3)
COL_NAME = 4         # Activity Name
COL_TARGET = 6       # Incentivised Target Finish
COL_CURRENT = 9      # Current Finish (P05)   <- was col 8 for P04
COL_MOVEMENT = 11    # Period Movement
COL_STATUS = 13      # Status                 <- was col 12 for P04
COL_COMMENT = 14     # Variance Comments      <- was col 13 for P04

HEADER_EXPECTATIONS = {
    COL_AID: "Activity ID",
    COL_NAME: "Activity Name",
    COL_TARGET: "Incentivised Target Finish",
    COL_CURRENT: "Current Finish (P05)",
    COL_MOVEMENT: "Movement",
    COL_STATUS: "Status",
    COL_COMMENT: "Variance Comments",
}

# ---------- Brand palette ----------
REL_BLUE = RGBColor(0x00, 0x26, 0x6F)
FUT_BLUE = RGBColor(0x3D, 0x2C, 0xFF)
ELEC_GREEN = RGBColor(0x00, 0xF0, 0xA2)
OFF_BLACK = RGBColor(0x26, 0x26, 0x26)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LATE_RED = RGBColor(0xB3, 0x2D, 0x1E)
EARLY_TEAL = RGBColor(0x0E, 0x7C, 0x61)
LINE_GRAY = RGBColor(0xC7, 0xCC, 0xD6)
LABEL_GRAY = RGBColor(0x59, 0x59, 0x59)

FONT = "Arial"

# ---------- Editorial summary of variance commentary (update each period) ----------
# Keyed by Activity ID so it stays attached to the right milestone even if row order
# shifts. Period 05: the tracker's "Variance Comments" column is blank for every
# milestone (the only entries are "Complete" against the two finished ones), so there
# is no editorial copy to carry across. The single note below is derived from the
# tracker's own Period Movement and finish-date columns, not hand-written narrative.
COMMENTARY_SUMMARY = {
    "EISL-G6-CIV-23130": (
        "5-day movement recovered in period; forecast finish pulled back from "
        "26 Jan 2027 (P04) to the 21 Jan 2027 incentivised target, clearing the "
        "Behind Target status reported last period."
    ),
}

# Shown in italics under the commentary list when the tracker carried no written
# variance commentary this period. Set to None to suppress.
COMMENTARY_FOOTNOTE = (
    "No entries were recorded in the tracker's Variance Comments column this period; "
    "the note above is derived from the Period Movement and finish-date columns."
)


def clean(v):
    if v is None:
        return ""
    s = str(v).replace('​', '').replace('\xa0', ' ').strip()
    return re.sub(r'\s+', ' ', s)


def to_date(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    return datetime.strptime(clean(v), '%d-%b-%Y')


def status_category(status):
    if status.startswith('Complete'):
        return 'complete'
    if status.startswith('Behind'):
        return 'behind'
    return 'forecast'


def load_rows():
    wb = openpyxl.load_workbook(SRC_XLSX, data_only=True)
    ws = wb[SRC_TAB]

    # Guard against the column drift described above.
    problems = []
    for col, expected in HEADER_EXPECTATIONS.items():
        actual = clean(ws.cell(3, col).value)
        if expected.lower() not in actual.lower():
            problems.append(f"  col {col}: expected ~{expected!r}, found {actual!r}")
    if problems:
        raise SystemExit(
            "Source columns have moved - update the COL_* constants:\n"
            + "\n".join(problems)
        )

    rows = []
    for r in range(FIRST_ROW, LAST_ROW + 1):
        name = clean(ws.cell(r, COL_NAME).value)
        m = re.match(r'^\[(\w+)\]\s*-?\s*(.*)', name)
        tag, short = (m.group(1), m.group(2)) if m else ("", name)
        short = short.lstrip('- ').strip()
        target = to_date(ws.cell(r, COL_TARGET).value)
        curr = to_date(ws.cell(r, COL_CURRENT).value)
        rows.append(dict(
            aid=clean(ws.cell(r, COL_AID).value),
            tag=tag,
            name=short,
            target=target,
            curr=curr,
            # Computed straight from the two date columns - robust to the sign
            # convention of the sheet's own float/variance column, which has
            # changed between exports.
            var=(curr - target).days,
            movement=clean(ws.cell(r, COL_MOVEMENT).value),
            status=clean(ws.cell(r, COL_STATUS).value),
            comment=clean(ws.cell(r, COL_COMMENT).value),
        ))
    rows.sort(key=lambda x: x['target'])
    return rows


def add_dot(slide, x, y, d, color):
    sh = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    sh.fill.solid()
    sh.fill.fore_color.rgb = color
    sh.line.fill.background()
    sh.shadow.inherit = False
    return sh


def add_text(slide, x, y, w, h, text, size, color, bold=False, italic=False,
             align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font=FONT, wrap=True):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = wrap
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.name = font
    run.font.color.rgb = color
    return box


def build(rows):
    prs = Presentation(TEMPLATE_PPTX)

    title_only_layout = None
    for layout in prs.slide_masters[0].slide_layouts:
        if layout.name == "Title Only":
            title_only_layout = layout
            break
    assert title_only_layout is not None, "'Title Only' layout not found in template"

    slide = prs.slides.add_slide(title_only_layout)

    # ---------- Title ----------
    ttf = slide.shapes.title.text_frame
    tp = ttf.paragraphs[0]
    title_text = "Incentivised Milestones – Programme Timeline"
    if tp.runs:
        tp.runs[0].text = title_text
    else:
        tp.add_run().text = title_text

    # ---------- Subtitle ----------
    sub_box = slide.shapes.add_textbox(Inches(1.05), Inches(1.85), Inches(14.0), Inches(0.5))
    tf = sub_box.text_frame
    tf.word_wrap = True
    r = tf.paragraphs[0].add_run()
    r.text = f"Target vs. current forecast finish — {PERIOD_LABEL}"
    r.font.size = Pt(15)
    r.font.name = FONT
    r.font.color.rgb = LABEL_GRAY

    # ---------- Legend ----------
    leg_y, leg_x = 2.45, 1.05
    add_dot(slide, leg_x, leg_y + 0.03, 0.16, ELEC_GREEN)
    add_text(slide, leg_x + 0.26, leg_y, 1.1, 0.3, "Complete", 11, OFF_BLACK)
    add_dot(slide, leg_x + 1.5, leg_y + 0.03, 0.16, FUT_BLUE)
    add_text(slide, leg_x + 1.76, leg_y, 1.9, 0.3, "Forecast on target", 11, OFF_BLACK)
    add_dot(slide, leg_x + 3.9, leg_y + 0.03, 0.16, LATE_RED)
    add_text(slide, leg_x + 4.16, leg_y, 1.5, 0.3, "Behind target", 11, OFF_BLACK)
    add_text(slide, leg_x + 5.9, leg_y, 0.5, 0.3, "+5d", 11, LATE_RED, bold=True)
    add_text(slide, leg_x + 6.35, leg_y, 1.9, 0.3, "later than target date", 11, OFF_BLACK)
    add_text(slide, leg_x + 8.5, leg_y, 0.5, 0.3, "-5d", 11, EARLY_TEAL, bold=True)
    add_text(slide, leg_x + 8.95, leg_y, 1.8, 0.3, "ahead of target date", 11, OFF_BLACK)

    # ---------- Timeline ----------
    LINE_Y = 5.75
    X0, X1 = 1.3, 18.7
    n = len(rows)
    xs = [X0 + i * (X1 - X0) / (n - 1) for i in range(n)]

    line = slide.shapes.add_connector(1, Inches(X0), Inches(LINE_Y), Inches(X1), Inches(LINE_Y))
    line.line.color.rgb = LINE_GRAY
    line.line.width = Pt(2.25)

    LABEL_W = 2.5
    NODE_D = 0.42

    for i, (x, row) in enumerate(zip(xs, rows)):
        cat = status_category(row['status'])
        node_color = {'complete': ELEC_GREEN, 'behind': LATE_RED, 'forecast': FUT_BLUE}[cat]
        above = (i % 2 == 0)

        add_dot(slide, x - NODE_D / 2, LINE_Y - NODE_D / 2, NODE_D, node_color)
        numbox = slide.shapes.add_textbox(Inches(x - NODE_D / 2), Inches(LINE_Y - NODE_D / 2),
                                          Inches(NODE_D), Inches(NODE_D))
        ntf = numbox.text_frame
        ntf.margin_left = ntf.margin_right = ntf.margin_top = ntf.margin_bottom = 0
        ntf.vertical_anchor = MSO_ANCHOR.MIDDLE
        npar = ntf.paragraphs[0]
        npar.alignment = PP_ALIGN.CENTER
        nrun = npar.add_run()
        nrun.text = str(i + 1)
        nrun.font.size = Pt(13)
        nrun.font.bold = True
        nrun.font.name = FONT
        nrun.font.color.rgb = OFF_BLACK if cat == 'complete' else WHITE

        stem_len = 0.35
        if above:
            stem = slide.shapes.add_connector(1, Inches(x), Inches(LINE_Y - NODE_D / 2 - stem_len),
                                              Inches(x), Inches(LINE_Y - NODE_D / 2))
        else:
            stem = slide.shapes.add_connector(1, Inches(x), Inches(LINE_Y + NODE_D / 2),
                                              Inches(x), Inches(LINE_Y + NODE_D / 2 + stem_len))
        stem.line.color.rgb = LINE_GRAY
        stem.line.width = Pt(1.25)

        label_x = max(0.4, min(x - LABEL_W / 2, 20 - 0.4 - LABEL_W))
        name_y = (LINE_Y - NODE_D / 2 - stem_len - 1.55) if above else (LINE_Y + NODE_D / 2 + stem_len)

        add_text(slide, label_x, name_y, LABEL_W, 0.62, row['name'], 11, OFF_BLACK,
                 bold=True, align=PP_ALIGN.CENTER, wrap=True)

        date_y = name_y + 0.62
        target_str = row['target'].strftime('%d %b %Y')
        curr_str = row['curr'].strftime('%d %b %Y')
        if row['var'] == 0:
            add_text(slide, label_x, date_y, LABEL_W, 0.24,
                     f"Target & {PERIOD_SHORT}: {target_str}", 9.5, LABEL_GRAY, align=PP_ALIGN.CENTER)
            chip_y = date_y + 0.26
        else:
            add_text(slide, label_x, date_y, LABEL_W, 0.22, f"Target: {target_str}", 9.5,
                     LABEL_GRAY, align=PP_ALIGN.CENTER)
            var_color = LATE_RED if row['var'] > 0 else EARLY_TEAL
            sign = "+" if row['var'] > 0 else ""
            add_text(slide, label_x, date_y + 0.22, LABEL_W, 0.22,
                     f"{PERIOD_SHORT} Finish: {curr_str} ({sign}{row['var']}d)", 9.5, var_color,
                     bold=True, align=PP_ALIGN.CENTER)
            chip_y = date_y + 0.48

        pill_w, pill_h = 1.6, 0.26
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x - pill_w / 2),
                                      Inches(chip_y), Inches(pill_w), Inches(pill_h))
        try:
            pill.adjustments[0] = 0.5
        except Exception:
            pass
        pill.line.fill.background()
        pill.shadow.inherit = False
        ptf = pill.text_frame
        ptf.margin_left = ptf.margin_right = ptf.margin_top = ptf.margin_bottom = 0
        ptf.vertical_anchor = MSO_ANCHOR.MIDDLE
        ppar = ptf.paragraphs[0]
        ppar.alignment = PP_ALIGN.CENTER
        prun = ppar.add_run()
        pill.fill.solid()
        if cat == 'complete':
            pill.fill.fore_color.rgb = ELEC_GREEN
            prun.text = "Complete"
            prun.font.color.rgb = OFF_BLACK
        elif cat == 'behind':
            pill.fill.fore_color.rgb = LATE_RED
            prun.text = "Behind Target"
            prun.font.color.rgb = WHITE
        else:
            pill.fill.fore_color.rgb = REL_BLUE
            prun.text = "Forecast On Target"
            prun.font.color.rgb = WHITE
        prun.font.size = Pt(9.5)
        prun.font.bold = True
        prun.font.name = FONT

    # ---------- Commentary ----------
    add_text(slide, 1.05, 8.15, 6.0, 0.24, f"Commentary — {PERIOD_LABEL}", 12, REL_BLUE, bold=True)

    cy = 8.42
    for row in rows:
        if row['aid'] not in COMMENTARY_SUMMARY:
            continue
        idx = rows.index(row) + 1
        text = f"{idx} · {row['name']} — {COMMENTARY_SUMMARY[row['aid']]}"
        add_text(slide, 1.05, cy, 17.9, 0.22, text, 10, OFF_BLACK)
        cy += 0.24

    if COMMENTARY_FOOTNOTE:
        add_text(slide, 1.05, cy + 0.02, 17.9, 0.22, COMMENTARY_FOOTNOTE, 9.5, LABEL_GRAY, italic=True)

    # ---------- Source / scale caption ----------
    add_text(slide, 1.05, 9.55, 17.9, 0.4,
             "Milestones ordered chronologically by incentivised target date; spacing is not to "
             f"scale. Source: Incentivised Milestones tracker ({PERIOD_LABEL}).",
             9, LABEL_GRAY, italic=True)

    # ---------- Drop the template's own slides, keep only the new one ----------
    R_NS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
    xml_slides = prs.slides._sldIdLst
    for sld in list(xml_slides)[:-1]:
        # drop_rel removes the orphaned slide part from the saved package too,
        # so no post-hoc unzip/clean pass is needed.
        prs.part.drop_rel(sld.get(R_NS))
        xml_slides.remove(sld)

    prs.save(OUT_PPTX)
    return OUT_PPTX


def main():
    rows = load_rows()
    print(f"{'#':<3}{'Milestone':<58}{'Target':<13}{PERIOD_SHORT+' Finish':<13}{'Var':<7}Status")
    for i, row in enumerate(rows, 1):
        print(f"{i:<3}{row['name'][:56]:<58}"
              f"{row['target'].strftime('%d %b %Y'):<13}"
              f"{row['curr'].strftime('%d %b %Y'):<13}"
              f"{(str(row['var'])+'d'):<7}{row['status']}")
    out = build(rows)
    print(f"\nSaved {out}")


if __name__ == "__main__":
    sys.exit(main())
