# Databert

Databert Services

## Interactive CV Dashboard

`index.html` is a self-contained, editable dashboard CV — one file, no build step, no
dependencies. Open it in any browser (or host it on GitHub Pages) and it just runs.

### What it does

The page is a **read-only document** — nothing on it can be changed by a reader. What it
offers instead:

| | |
| --- | --- |
| Contact details | Live `mailto:` / `tel:` / LinkedIn links, each with a one-click copy button |
| Career journey | Select a role to bring it forward and fade the rest; <kbd>Esc</kbd> or a second select clears it |
| Skills snapshot | Hover a donut segment *or* its label to highlight both and read the share in the middle; click to pin it |
| Tech stack & industries | Hover any bar for its exact level |
| Theme | Light / dark, following your system on first visit and remembered afterwards |
| PDF | Sizes the page so the whole dashboard prints on a single sheet |

Everything interactive is reachable with <kbd>Tab</kbd> and activated with <kbd>Enter</kbd>.
The only thing kept in browser storage is the theme choice.

### Structure

All content lives in the `DEFAULT_DATA` object near the top of the script, so the starting CV
can also be changed directly in the source rather than through the UI.
