# Databert

Databert Services

## Interactive CV Dashboard

`index.html` is a self-contained, read-only CV dashboard — one file, no build step, no
dependencies. Open it in any browser (or host it on GitHub Pages) and it just runs.

It is positioned for **analytics engineering in rail infrastructure project controls**: the
headline, summary, expertise pillars, tech stack and projects all lead with that, and the
sidebar carries a Project Controls block (earned value, cost control, schedule data, change
and risk, baseline governance, period reporting) that a generic data CV does not have.

### What it does

| | |
| --- | --- |
| Focus lenses | Five chips along the top — Analytics Engineering, Project Controls, Rail Delivery, AI & Automation, Leadership — filter the **whole dashboard** at once, lighting every matching skill, role, tool, project and metric and fading the rest |
| Career journey | Select a role to open the detail behind it: scope, the stack it was built on, and what came out of it |
| Contact details | Live `mailto:` / `tel:` / LinkedIn / GitHub links, each with a one-click copy button |
| Skills snapshot | Hover a donut segment *or* its label to highlight both and read the share in the middle; click to pin it |
| Tech stack & industries | Hover any bar for its exact level |
| Theme | Light / dark, following your system on first visit and remembered afterwards |
| PDF | Sizes the page so the whole dashboard prints on a single sheet |
| Constellation backdrop | A canvas starfield behind the page that drifts, links neighbouring nodes and reacts to the cursor; it is skipped under `prefers-reduced-motion` and never printed |
| Service links | Mentorship (MentorCruise) and Databert Consulting sit in the top panel, and databert.co.uk is in the contact list so it survives the PDF |

Everything interactive is reachable with <kbd>Tab</kbd> and activated with <kbd>Enter</kbd>;
<kbd>Esc</kbd> closes the open drawer or clears the lens. The only thing kept in browser
storage is the theme choice.

### Structure

All content lives in the `DEFAULT_DATA` object near the top of the script. Items carry a
`lens` array (`ae`, `pc`, `rail`, `ai`, `lead`) which is what the focus chips filter on, and
each career entry carries a `detail` block for its drawer.
