# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.1.6](https://github.com/ishakantony/snippaste/compare/v0.1.5...v0.1.6) (2026-05-04)


### Bug Fixes

* **client:** hide locked toolbar actions and reset save state on unlock ([e09602d](https://github.com/ishakantony/snippaste/commit/e09602d2bcb7ac959edf00acce8ce2ad08c2491c))
* **mobile:** resolve locked snip sheet and landing scroll issues ([b1c067f](https://github.com/ishakantony/snippaste/commit/b1c067fe26b5c81b16c8c5121b411f7a11472c88))

## [0.1.5](https://github.com/ishakantony/snippaste/compare/v0.1.4...v0.1.5) (2026-05-04)


### Features

* **client:** improve mobile editor layout ([5dc5f47](https://github.com/ishakantony/snippaste/commit/5dc5f4762f3b0d578bb889c83ea1ca7703abbd6e))
* **db:** migrate snip store to drizzle ([650dd3f](https://github.com/ishakantony/snippaste/commit/650dd3f967cd72e90a56e9c2a4737a5d69ed2a31))


### Bug Fixes

* **test:** target confirm dialog by test id ([1f2b85e](https://github.com/ishakantony/snippaste/commit/1f2b85e69927b7234086f304cc9fdbdb0a194a18))

## [0.1.4](https://github.com/ishakantony/snippaste/compare/v0.1.3...v0.1.4) (2026-05-03)


### Features

* add openapi integration with hono and use hono rpc ([b8f1183](https://github.com/ishakantony/snippaste/commit/b8f118360decfe9bf20f663db5ffa4fc53a10d5c))


### Bug Fixes

* broken packages ([5937e16](https://github.com/ishakantony/snippaste/commit/5937e1650c9cb0b6ef6a4e845075a41fb995618c))
* **client:** stabilize session and qr rendering ([27dbc15](https://github.com/ishakantony/snippaste/commit/27dbc151936cde767ef8a5bf67eefeb6c2004eda))

## [0.1.3](https://github.com/ishakantony/snippaste/compare/v0.1.2...v0.1.3) (2026-05-02)


### Features

* **autosave:** add optional auto-save with feature flag and settings modal ([a075bff](https://github.com/ishakantony/snippaste/commit/a075bff1512b170a50d903e9ac02d55307d22f17))
* **password:** add protected snips ([495cd80](https://github.com/ishakantony/snippaste/commit/495cd80b900d8173deef45ecba7e60933565a914))
* **toolbar:** add expiration countdown and reposition auto-save pill ([138ce8f](https://github.com/ishakantony/snippaste/commit/138ce8ffca659eb0f666797f5dfb33f90ad7c020))


### Bug Fixes

* **editor:** separate loading and error fallbacks ([3d92843](https://github.com/ishakantony/snippaste/commit/3d92843daa59310366ec8211672d1c40fdea2ce1))

## [0.1.2](https://github.com/ishakantony/snippaste/compare/v0.1.1...v0.1.2) (2026-05-02)


### Features

* add i18n support with language switcher and group toolbar controls ([17426e6](https://github.com/ishakantony/snippaste/commit/17426e660c55c87768e780fbc0dc6535167e6c05))
* **flags:** add client-side feature flag system via env vars ([a15d3e0](https://github.com/ishakantony/snippaste/commit/a15d3e0c4b60dacd5b430f11601c11c59598a5fc))
* **i18n:** add simplified chinese and indonesian translations ([3b1f6cb](https://github.com/ishakantony/snippaste/commit/3b1f6cb7bdf4a0d5ebd7f09faaf92bc00ff5e467))

## 0.1.1 (2026-05-02)


### Features

* **001:** implement project tracer — full end-to-end scaffold ([328ffbf](https://github.com/ishakantony/snippaste/commit/328ffbf56a6d10635286db310253f2a11dbda4d9))
* **005:** replace textarea with CodeMirror 6 editor on snip page ([6360a8c](https://github.com/ishakantony/snippaste/commit/6360a8c971deb4fda0efa612c9cc463b1cc0023d))
* **006:** add Toolbar component with copy URL, copy, download, clear actions ([7330ecf](https://github.com/ishakantony/snippaste/commit/7330ecf8211229312ebefe9b85971b0019caa067))
* **008:** apply OS-driven theming via CSS custom properties and CodeMirror dark theme ([b4313dd](https://github.com/ishakantony/snippaste/commit/b4313dd174ce68095e333b8a120d50ca13e5270b))
* add QR code sharing for snippets ([1ac0f81](https://github.com/ishakantony/snippaste/commit/1ac0f814ed44e2902424492d67de8eafc0380bd5))
* **slug-validator:** add SlugValidator deep module and enforce 400 on invalid slugs ([160471b](https://github.com/ishakantony/snippaste/commit/160471baea495c5e3dd3f62d4bca96ccc4374246))


### Bug Fixes

* remove css reset in index.html ([2f06929](https://github.com/ishakantony/snippaste/commit/2f06929f282c0275449e32b9c4b0fba412857f56))
* restore icons with lucide-react and missing CSS custom properties ([de7f182](https://github.com/ishakantony/snippaste/commit/de7f18265ebf160a38439e53d35d57e2e15c6ac6))
