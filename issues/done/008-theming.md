## Parent PRD

`issues/prd.md`

## What to build

Apply theming that follows the user's OS via CSS `prefers-color-scheme`. No toggle, no localStorage, no JavaScript-driven switching — pure CSS. Both the landing page and the snip page (toolbar + CodeMirror editor) respond to the system theme.

See **Behavior decisions** (theme follows prefers-color-scheme) in the parent PRD.

## Acceptance criteria

- [ ] Light and dark color tokens are defined as CSS custom properties on `:root`, with the dark-mode values applied inside an `@media (prefers-color-scheme: dark)` block
- [ ] All app chrome (landing hero, name input, button, toolbar, indicator, action buttons) reads from these tokens and renders correctly in both modes
- [ ] CodeMirror is configured to follow the system theme — light theme variant under light mode, dark theme variant under dark mode
- [ ] Switching the OS appearance updates the app appearance without a page reload (CSS-driven, no JS)
- [ ] Manual verification on at least one browser shows correct rendering in both modes for `/` and `/s/:name`

## Blocked by

- Blocked by `issues/006-toolbar-and-actions.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 17
