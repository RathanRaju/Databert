---
title: Incentivised Milestones — Programme Timeline Slide
tags: [project-controls, tru, powerpoint, milestones, pptx]
aliases: [Incentivised Milestones Slide, TRU Milestone Timeline]
created: 2026-08-13
updated: 2026-09-10
---

# Incentivised Milestones — Programme Timeline Slide

## What this is

A branded PowerPoint slide showing the incentivised programme milestones as a horizontal timeline, built for the TransPennine Route Upgrade (TRU) programme. It distinguishes Complete / Forecast On Target / Behind Target milestones, highlights any variance between the incentivised target date and the current period's finish date, and summarises the variance commentary at the bottom.

Deliverable: single-slide `.pptx`, styled from the TRU branding template — not inserted into a full deck.

**Current build: Period 05** (`Incentivised_Milestones_Programme_Timeline_P05.pptx`).

## How to replicate next month

1. Get the latest `Incentivised Milestones.` tab export (same filename pattern, e.g. `2627_Incentivised_Milestones.xlsx`).
2. **Re-point the column constants.** The tracker gains a new `Current Finish (P0x)` column each period, which pushes every column to its right one place along. Update `COL_CURRENT`, `COL_MOVEMENT`, `COL_STATUS`, `COL_COMMENT` and the `HEADER_EXPECTATIONS` dict in the script. The script asserts the header row against those expectations and exits with a diff if they've drifted, so a missed update fails loudly rather than silently reading the wrong column. See [Source data](#source-data).
3. Update the `COMMENTARY_SUMMARY` dict — read the new period's `Variance Comments` column and hand-write a one-line summary per milestone that has a substantive note, keyed by Activity ID. Skip cells that just say "Complete" or are blank. If the column is empty for every milestone (as in Period 05), see [When the commentary column is empty](#when-the-commentary-column-is-empty).
4. Check whether any milestone's `Status` column has introduced a new category beyond `Complete On Target` / `Forecast On Target` / `Behind Target` — extend `status_category()` and the node/pill colour mapping if so.
5. Update `PERIOD_LABEL` and `PERIOD_SHORT` at the top of the script (they drive the subtitle, the per-milestone date lines, the commentary heading and the source caption).
6. Run the script, then validate/render exactly as in [Post-generation steps](#post-generation-steps), and do a visual QA pass — check label wrapping especially where milestone names or commentary lines run long.

## Source data

- **File:** `2627_Incentivised_Milestones.xlsx`
- **Tab:** `Incentivised Milestones.`
- **Data rows:** 4–11 (header on row 3)
- Milestone names carry a leading tag (`[CARD]`, `[STRAT]`, `[TACT]`) that is stripped from the on-slide label for readability.

### Column positions — these move every period

A new `Current Finish (P0x)` column is inserted each period, shifting everything to its right. Positions seen so far:

| Column | P04 export | P05 export |
|---|---|---|
| Activity ID (Lvl 3) | 3 | 3 |
| Activity Name | 4 | 4 |
| Incentivised Target Finish | 6 | 6 |
| Current Finish (current period) | 8 | **9** |
| Float vs Target | 9 | 10 |
| Period Movement | 10 | 11 |
| Weighting | 11 | 12 |
| Status | 12 | **13** |
| Variance Comments | 13 | **14** |

Reading Status/Comments from the stale positions is silent and plausible-looking (you get `Weighting` and `Status` instead), which is why `HEADER_EXPECTATIONS` guards them.

### Other source-data traps

- **The day-variance column is not stable across exports.** In the first export it was headed "Target Variance" (positive = late). In the following months it was renamed "Float vs Target" with the sign flipped (positive = ahead/float, negative = behind). Rather than trust that column's sign each time, **the script computes the variance itself directly from the two date columns** (`P0x Finish − Target Finish`, in days), so the "+5d later than target" / "-23d ahead of target" labels stay correct regardless of how that column is defined in a future export.
- The sheet's own **Status** column can lag the real variance — in the P04 export one milestone showed "Forecast On Target" while its target-vs-current gap wasn't zero. The slide always shows the true computed variance, independent of what the Status column says.
- **Date cells are mixed types.** The two completed milestones store their dates as text (`26-May-2026`); the rest are real datetimes. `to_date()` handles both.
- Cells are peppered with zero-width spaces (`​`) and non-breaking spaces (`\xa0`) — `clean()` strips them before any comparison. Status values arrive as `Complete\xa0On Target`, so matching on a plain `"Complete On Target"` string without cleaning will fail.
- The workbook also carries raw `Import PEND 0x` schedule dumps (~98k rows). Their `Comments` column holds **stale P03/P09/P13 planner notes**, not the current period's variance commentary — don't source slide commentary from there.

## Brand reference (TRU)

Source: `TRU002-TRUPowerpointTemplate-ReducedContentVersionmp3-9477542a.pptx`

| Name | Hex |
|---|---|
| Reliable Blue | `#00266F` |
| Future Blue | `#3D2CFF` |
| Electric Green | `#00F0A2` |
| Off-Black | `#262626` |
| White | `#FFFFFF` |

- Font: **Arial** (the template's cross-platform stand-in for Helvetica Now)
- Slide size: 20" × 11.25"
- Built from the template's **"Title Only"** layout, which already carries the footer bar, logo lockup, and title placeholder styling — leaving a blank canvas for the custom timeline graphic.

> **Template substitution:** any deck carrying the TRU master works as the base — the P05 build used the previous month's generated slide (`P04_reference.pptx`) because the original template file wasn't to hand. Its master, all 15 layouts and all 11 media parts are identical to the template's, and the script drops the base deck's own slides at the end, so the output is the same either way. `TEMPLATE_PPTX` at the top of the script points at whichever is available.

Two extra colours sit outside the core brand palette, used only as a functional RAG-style cue for schedule variance and status — not as a decorative motif:

| Purpose | Hex |
|---|---|
| Late / behind target | `#B32D1E` |
| Early / ahead of target | `#0E7C61` |

## Design approach

- Milestones plotted in **chronological order** by target date, evenly spaced left to right (not scaled to actual calendar distance — a caption on the slide says so explicitly).
- Labels **alternate above/below** the timeline to avoid crowding, connected to their node with a short stem line.
- Each node is a numbered circle, colour-coded by status:

  | Status category | Node/pill colour | Pill label |
  |---|---|---|
  | Complete | Electric Green | "Complete" |
  | Forecast On Target | Future Blue | "Forecast On Target" |
  | Behind Target | Late Red | "Behind Target" |

- Each label shows: milestone name, target date, and — only where it differs — the current-period finish date with a coloured `+Nd` / `-Nd` variance badge (red = late, teal = early).
- A **legend row** below the subtitle explains the node colours and the variance badge colours. It is a standing key: the "Behind target" swatch stays on the slide even in a period where no milestone is behind target, so the slide reads the same way month to month.
- A **"Commentary — Period 0x"** block beneath the timeline gives a one-line editorial summary for each milestone with a substantive `Variance Comments` entry, prefixed with its timeline number for cross-reference (e.g. "4 · RBA/2 Baker Viaduct Complete — ..."). Comments that just restate the status (e.g. "Complete") or are blank are left out.
- A closing italic caption notes the data source and that spacing isn't to scale.

## Milestone data (Period 05)

| # | Milestone | Target | P05 Finish | Variance | Status |
|---|---|---|---|---|---|
| 1 | EIS H - Entry into Service | 26 May 2026 | 26 May 2026 | — | Complete |
| 2 | EIS N W4 Finish 28d Blockade | 27 Jun 2026 | 27 Jun 2026 | — | Complete |
| 3 | Gledholt 16-day Blockade Complete | 05 Oct 2026 | 05 Oct 2026 | — | Forecast On Target |
| 4 | RBA/2 Baker Viaduct Complete | 21 Jan 2027 | 21 Jan 2027 | — | Forecast On Target |
| 5 | EIS K - Entry into Service – Huddersfield Station | 01 Feb 2027 | 01 Feb 2027 | — | Forecast On Target |
| 6 | EIS J – Entry into Service - Deighton Station | 01 Feb 2027 | 01 Feb 2027 | — | Forecast On Target |
| 7 | EIS N4 - W3A: Area 2 and 3 Civils Works Complete for fast lines | 21 Feb 2027 | 29 Jan 2027 | -23d | Forecast On Target |
| 8 | EIS L7 - Thornhill Bridge Complete and Ready for EIS L Blockade | 28 Mar 2027 | 28 Mar 2027 | — | Forecast On Target |

### What changed from Period 04

- **4 · RBA/2 Baker Viaduct Complete** recovered its 5-day slip: P04 forecast 26 Jan 2027 (Behind Target, +5d) → P05 forecast 21 Jan 2027, back on the incentivised target. Its `Period Movement` cell reads 5 and its total float returns to 0 (it was -3 in the P04 import). This is the only milestone that moved in period.
- **No milestone is Behind Target in Period 05.** The red node/pill colour is therefore unused this period; the legend still carries the swatch.
- Milestone ordering, target dates and every other forecast finish are unchanged from Period 04, so the timeline numbering is directly comparable between the two slides.
- Row order in the source sheet changed (Baker Viaduct and EIS N4 - W3A swapped rows 7/8), but the script sorts by target date, so the slide is unaffected.

### When the commentary column is empty

The Period 05 export carries **no `Variance Comments` at all** — the only non-blank cells are "Complete" against the two finished milestones, which the design already excludes. Rather than leave the block empty or invent editorial copy, the P05 slide shows one note derived strictly from the tracker's own `Period Movement` and finish-date columns (the Baker Viaduct recovery), followed by an italic footnote saying exactly that:

> No entries were recorded in the tracker's Variance Comments column this period; the note above is derived from the Period Movement and finish-date columns.

If the PMO supplies written commentary later, drop it into `COMMENTARY_SUMMARY` keyed by Activity ID and set `COMMENTARY_FOOTNOTE = None`.

## Regeneration script

`generate_milestone_slide.py` — requires `openpyxl` and `python-pptx`. Update the period constants, the `COL_*` constants, and `COMMENTARY_SUMMARY` before rerunning against a new month's export.

```bash
pip install openpyxl python-pptx
python3 generate_milestone_slide.py
```

It prints the parsed milestone table to stdout (a quick check that the columns are being read correctly) before writing the `.pptx`.

## Post-generation steps

The script now drops the base deck's own slides via `drop_rel()`, which removes the orphaned slide parts from the saved package — so **the old unzip / `clean.py` / rezip pass is no longer needed**. Verify and render:

```bash
# render to PDF, then to images, and eyeball every element
soffice --headless --convert-to pdf --outdir build Incentivised_Milestones_Programme_Timeline_P05.pptx
python3 -c "import pymupdf; [p.get_pixmap(dpi=110).save(f'build/P05_{i+1}.png') for i,p in enumerate(pymupdf.open('build/Incentivised_Milestones_Programme_Timeline_P05.pdf'))]"
```

> Rendering needs **`libreoffice-impress`** — `libreoffice-core` alone cannot load a `.pptx` and fails with a bare "source file could not be loaded", which looks like a corrupt file but isn't. `apt-get update && apt-get install -y libreoffice-impress`. Rasterising uses `pymupdf` (`pdftoppm`/poppler isn't installed).

Structural checks worth re-running (all passed for the P05 build):

- exactly one slide in the package, on the `Title Only` layout;
- no dangling relationship targets and no `[Content_Types].xml` overrides pointing at missing parts;
- all 11 `ppt/media/` parts present and byte-identical to the template's (the branding lockups);
- no leftover placeholder text — scan the slide's text for `x{3,}`, `lorem`, `ipsum`, `TODO`, `[insert`, `click to edit`, and for the **previous** period's labels (`Period 04`, `P04 Finish`, `Target & P04`).

**Visual QA checklist** (things that broke or nearly broke during earlier builds — check these first):

- Title length vs. any element sharing its row — the legend used to sit close enough to the title text to nearly touch; it now lives on its own row below the subtitle, but re-check if the title wording changes length.
- Milestone-name wrapping — long names (e.g. "EIS L7 - Thornhill Bridge Complete and Ready for EIS L Blockade") wrap to 3 lines; confirm the label box height still clears the date/pill below it.
- Vertical clearance between the "below the line" pills and the Commentary block — tightest gap in the layout. With no below-line milestone carrying a variance line this period the gap is ~0.7"; it drops to ~0.48" when one does. If commentary grows to 3+ lines, either shrink `stem_len`/`LINE_Y` further or drop the font size a point.

## Status categories seen so far

| Category | Node/pill colour | Notes |
|---|---|---|
| Complete On Target | Electric Green | On or ahead of target and finished |
| Forecast On Target | Future Blue | Not yet due; tracking to target |
| Behind Target | Late Red | Seen in the Period 04 revision; **absent in Period 05**. Extend `status_category()` if the tracker introduces further categories (e.g. "At Risk") |

## Open items / possible follow-ups

- Weighting (% incentive value per milestone) is in the source sheet but still left off the slide to avoid clutter — could be added as a small tag if wanted.
- Could be inserted into a specific slide position within a larger deck rather than delivered standalone.
- `COMMENTARY_SUMMARY` is hand-curated each period rather than auto-generated from the raw `Variance Comments` text — intentional, since the raw comments are long and informal; keep summarizing to one line per flagged milestone.
- A `Period Movement` badge on each node (distinct from variance-vs-target) would have surfaced the Baker Viaduct recovery on the timeline itself rather than only in commentary — worth considering if in-period movement becomes a recurring talking point.
