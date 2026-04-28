## Parent PRD

`issues/prd.md`

## What to build

Add the thin top toolbar above the CodeMirror editor with the layout: snip name on the left, save indicator centered, and four icon action buttons on the right — copy URL, copy content, download, clear. The clear action shows a confirmation dialog before wiping the editor and saving an empty string (which propagates through `AutosaveController` like any other change).

See **Implementation Decisions → Framework glue → React shells** and **Behavior decisions** (clear semantics) in the parent PRD.

## Acceptance criteria

- [ ] A thin top bar (~36 px) is rendered above the editor with three regions: name (left), save indicator (center), action buttons (right)
- [ ] The snip name (the URL slug) is displayed as plain text on the left
- [ ] The save indicator from issue 004 is moved into the center of the toolbar
- [ ] Copy URL button copies the full absolute URL of the current snip page (e.g. `https://snippaste.ishak.stream/s/<slug>`) to the clipboard
- [ ] Copy content button copies the editor's current text to the clipboard
- [ ] Download button triggers a browser download of `<slug>.txt` containing the editor's current text
- [ ] Clear button opens a confirmation dialog explaining that everyone with the URL will see the snip as empty; on confirm, the editor is wiped and the change is saved through `AutosaveController` (resulting in `Saved ✓`); on cancel, nothing changes
- [ ] Editor occupies the entire viewport area below the toolbar

## Blocked by

- Blocked by `issues/005-codemirror-editor.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 7
- User story 8
- User story 11
- User story 12
- User story 13
- User story 14
- User story 15
