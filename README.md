# Databert

Databert Services

## Interactive CV Dashboard

`index.html` is a self-contained, editable dashboard CV — one file, no build step, no
dependencies. Open it in any browser (or host it on GitHub Pages) and it just runs.

### Editing

The page is **always editable** — there is no edit mode to switch on. Click any text and type.
Controls stay hidden until you hover the thing they belong to, so at rest the dashboard looks
exactly like a finished CV.

| What | How |
| --- | --- |
| Text | Click any heading, bullet, figure or paragraph and type over it |
| Progress bars | Drag a bar to set its percentage |
| Colours | Hover an item; a pill of colour dots floats over it |
| Icons | Click an icon to cycle through the icon set |
| Photo | Hover the avatar and click the camera button |
| Add | Hover a card and a **+** appears beside its heading |
| Remove | Hover a single entry for its bin icon |
| Skill weights | Hover the Skills card; the weights panel drops out of its bottom edge |
| Lock | <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>E</kbd> freezes the page against accidental edits |

Changes save to the browser automatically. **Export** copies the whole CV out as JSON and
**Import** loads it back — that is how you move your edits to another browser or machine.
**Reset** restores the original content.

### Other features

- **Light / dark themes** — follows your system setting on first visit, then remembers your choice
- **PDF** — sizes the page so the dashboard prints onto a single sheet
- **Responsive** — the grid collapses cleanly down to phone width
- **Animated** — count-up figures, bar fills, an interactive skills donut and reveal-on-scroll

### Structure

All content lives in the `DEFAULT_DATA` object near the top of the script, so the starting CV
can also be changed directly in the source rather than through the UI.
