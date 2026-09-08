# RLAB & Sign-off Forecast Dashboard

`RLAB_Forecast_Dashboard_3.html` — a single self-contained file (no server, no
build, no network calls). Open it in a browser; everything renders from the
schedule extract embedded in the file. **Load new extract (.csv)** in the sidebar
swaps in a fresh extract for that browser session.

Built on version 2 of the dashboard. Every page from that version is unchanged in
behaviour; the additions below are new.

## Pages

| Page | What it answers |
|---|---|
| **Executive Summary** *(new)* | Where both work streams stand, and the findings the numbers support |
| Forecast Dashboard | Planned completion by reporting period, with the activity table |
| **Velocity & Burn-up** *(new)* | What has actually been delivered per period, against what is now required |
| Cumulative S-Curve | Cumulative forecast profile, RAB vs sign-off |
| **Coverage & Gap** *(new)* | Where red-line activity is missing against its associated sign-off |
| **Risk & Data Quality** *(new)* | Delivery risk in the schedule shape, and exceptions in the extract |
| EIS × IDT Summary | Counts by IDT for each EIS |

## Reporting period

Every time-based figure is read "as at" one reporting period. It is derived from
the extract rather than hard-coded: finish dates and period numbers are linearly
related (periods are a fixed four weeks), so a least-squares fit over every row
places today's date on the extract's own period calendar. The sidebar shows which
period was chosen and lets it be moved, so a past or future cut-off can be
reviewed without editing the data.

## Derived measures

| Measure | Definition |
|---|---|
| Achieved rate | Activities completed in the six **closed** periods before the reporting period ÷ 6 |
| Required rate | Outstanding ÷ periods from the reporting period to the last planned finish, inclusive |
| Delivery pressure | Required rate ÷ achieved rate |
| Projected finish / slip | Outstanding ÷ achieved rate, counted forward, compared with the last planned period |
| Sign-off coverage | RAB count ÷ sign-off count for the same group |
| Gap | Sign-off count − RAB count (positive = red-line shortfall) |
| Past due | Planned finish period earlier than the reporting period, not recorded complete |
| Period load ratio | Outstanding planned into one period ÷ achieved rate |

The Executive Summary carries the same table in-page, with the threshold each
measure is flagged against.

## Filters

EIS, IDT, **discipline** *(new)*, **planner** *(new)* apply on every page.
Activity status applies on the Forecast Dashboard and the EIS × IDT Summary only —
the analytic pages need completed and outstanding activity in the same set for the
rate and coverage maths to hold. The RAB/Sign-off toggle applies on the Forecast
Dashboard only; every other page shows both streams together.

## Colour

One scheme across every chart, so a colour means the same thing on every page:

- hue carries **status** — `#00875F` complete/actual, `#3D2CFF` forecast/remaining
- dash carries **category** — solid RAB, dashed sign-off
- `#C1443C` is reserved for **exceptions** — shortfall, past due, anomaly

Those three mark colours were validated as a categorical set for lightness band,
chroma, colour-vision separation and contrast against the card surface. Version 2
painted "Completed" bars in electric green (`#00F0A2`, 1.46:1 against the white
card) while the S-curve used green ink for the same idea; both now use green ink.
Electric green stays as the sidebar accent.

## CSV input

Required columns are unchanged from version 2. `TRU_GRIP / PACE`,
`TRU_WoL_Planner` and `TRU_All Mile` are read when present and ignored when not,
so an older extract still loads — the discipline and planner filters simply show
fewer values.

Export buttons on the activity table, the coverage detail table and the sign-off
lead table write the current view to CSV (UTF-8 with BOM, so Excel opens it
cleanly).
