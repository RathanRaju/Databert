# Databert

Databert Services

## Interactive CV Dashboard

`index.html` is a self-contained, editable dashboard CV — one file, no build step, no
dependencies. Open it in any browser (or host it on GitHub Pages) and it just runs.

### Editing

Click **Edit** in the toolbar (or press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>E</kbd>) and the
whole page becomes editable:

| What | How |
| --- | --- |
| Text | Click any heading, bullet, figure or paragraph and type over it |
| Progress bars | Drag a bar to set its percentage |
| Colours | Click a dot in the swatch row under an item |
| Icons | Click an icon to cycle through the icon set |
| Photo | Click the camera button on the avatar |
| Add / remove | Dashed **+** buttons add entries; the bin icon on each item removes it |

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
