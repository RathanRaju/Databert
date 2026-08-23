# Analyst Sponsorship Radar

A standing job-alert system for UK data analytics, reporting and lead analyst roles
that come with Skilled Worker visa sponsorship.

Personal tooling — deliberately kept outside `databertwebsite/` so it is never
published as part of the Databert site.

## Contents

| File | What it is |
| --- | --- |
| `analyst-sponsorship-radar.html` | Source for the published Artifact dashboard |

Published artifact: https://claude.ai/code/artifact/54f1e48d-b374-421e-a4a5-69ce732751b9

To update the dashboard, edit the HTML here and republish it to the same URL.

## Email digest

A scheduled Routine (`UK analytics sponsorship job digest`) runs at `22 6 * * 1-5`
UTC — 07:22 UK during BST, 06:22 during GMT. Each firing starts a fresh session,
sweeps the boards for newly posted roles, and delivers a digest to
rathanr51@gmail.com.

Delivery uses the Routine's completion-notification email. Sessions fired by a
Routine created from the CLI do not inherit connector tools, so the digest is
written as the run's final response rather than sent through Gmail directly. To
upgrade to a styled Gmail message, recreate the Routine from the Routines UI on
claude.ai and attach the Gmail connector — the prompt already handles both paths.

## The strategy this encodes

Since 22 July 2025 the Skilled Worker route generally requires a role skilled to
RQF level 6. Plain "Data analyst" (SOC 3544, going rate £34,900) falls below that
line and survives only on the Temporary Shortage List, which expires
31 December 2026 and carries no right to bring dependants.

The durable lane is roles an employer can code at RQF 6:

| SOC | Occupation | Going rate |
| --- | --- | --- |
| 2433 | Actuaries, economists and statisticians | £55,100 |
| 2133 | IT business analysts, architects and systems designers | £54,900 |
| 2139 | IT professionals n.e.c. | £52,300 |
| 2132 | IT managers | £55,000 |

General salary floor is £41,700 or the occupation's going rate, whichever is
higher. A Lead or Senior analytics title is materially easier to place in the
durable lane than a plain analyst role.

Figures are as reported August 2026 and are for sanity-checking vacancies. The
binding rate is the one in force when the Certificate of Sponsorship is assigned —
confirm against Appendix Skilled Occupations on GOV.UK. Not immigration advice.
