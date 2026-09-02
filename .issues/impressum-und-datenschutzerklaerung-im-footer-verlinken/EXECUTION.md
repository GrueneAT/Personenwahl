# Execution: Impressum und Datenschutzerklärung im Footer verlinken

**Started:** 2026-09-02T13:53:00Z
**Status:** complete
**Branch:** issue/impressum-und-datenschutzerklaerung-im-footer-verlinken

## Execution Log

- [x] Add Impressum + Datenschutzerklärung links to the App.tsx footer,
      styled like the existing footer entries and the werkzeuge.gruene.at
      external link — commit `7866fdd`
  - Deviation: none. No `PLAN.md` existed for this issue (single-shot task
    executed directly from `ISSUE.md`).

## What changed

`apps/web/src/App.tsx` — footer (`<footer class="pt-6 border-t border-line …">`,
was line 376): two new `<a>` elements after the existing "Daten bleiben
lokal" / version-stamp spans:

- Impressum → `https://gruene.at/impressum/`
- Datenschutzerklärung → `https://gruene.at/datenschutzerklarung/`
  (verified exact spelling — no "ä", no "ss" — matches ISSUE.md and is
  present verbatim in the built JS bundle, see Verification below)

Both carry `target="_blank" rel="noopener"`, the same pattern already used
for the `nav-werkzeuge` external link in `.gat-toolnav`. Styling reuses the
footer's existing `text-xs text-ink-3` classes plus `underline` (the other
footer entries are plain text/mono, not links, so `underline` was added to
give the two new anchors a visible affordance without inventing a new
component). `data-testid="footer-impressum"` / `"footer-datenschutz"` were
added for test addressability, following the `data-testid` convention used
throughout `App.tsx`.

**Footer visibility on all routes — checked, not assumed.** The footer sits
inside the single `<main>` in `App.tsx`, after the `<Show when={mode() ===
'docs'}>` block that mounts `DocsHub` (which renders `DocsLayout`
internally). It is not inside any per-route `<Show>` itself, so it renders
unconditionally regardless of `mode()`. Confirmed at runtime (not just by
reading the JSX) via Playwright across `#/overview`, `#/stage1`, `#/stage3`,
and `#/docs` — see `footer-links.spec.ts`. No change to `DocsLayout.tsx` was
needed.

## Verification Results

**Build:** `pnpm build` — succeeded. `tech-manifest.ts` prebuild-drift check
passed (footer links don't touch dependencies, so the generated tech
manifest is unaffected).

**Built-result proof (not just source):** grepped the built bundle directly:
```
apps/web/dist/assets/index-DOKCIbG1.js:https://gruene.at/impressum/
apps/web/dist/assets/index-DOKCIbG1.js:https://gruene.at/datenschutzerklarung/
```
Both URLs are present verbatim in the compiled/minified output, confirming
the exact Datenschutzerklärung spelling survived the build unchanged.

**Typecheck:** `tsc --noEmit` — clean.

**Lint:** `eslint . && prettier --check` — clean.

**Unit tests:** `vitest run` — 22 files, 224 tests, all passed.

**E2E tests (Playwright):** all passed, including a full-suite run (94
passed, 1 pre-existing skip unrelated to this change) and a targeted run of
`audit-footer-parity.spec.ts` (unaffected — it scopes all its assertions to
`stage1-audit-footer`, a different footer than the app-level one touched
here) plus the new `footer-links.spec.ts`. See "Sandbox environment note"
below for how the browser was obtained.

New test: `apps/web/tests/e2e/footer-links.spec.ts` — asserts
`href`/`target`/`rel` for both links on the default route, and that both
stay visible across `#/overview`, `#/stage1`, `#/stage3`, `#/docs`.

### Sandbox environment note (not a code deviation)

This container's network path to Playwright's browser CDN
(`playwright.azureedge.net`) times out on every request; the documented
`playwright-akamai.azureedge.net` fallback completes the Chromium zip
download but then stalls indefinitely during extraction (~240 KB written,
no further progress after 10+ minutes, repeated across three attempts).
Firefox never got far enough to test. This is an infrastructure property of
the sandbox, not something introduced by this change — `PLAYWRIGHT_BROWSERS_PATH`
is a shared, container-wide cache (`/opt/playwright-browsers`), and its
`.links`/browser directories churn from other concurrent worktree sessions
in this shared container were visible during the attempts.

Rather than skip e2e verification, `apt-get install chromium firefox-esr`
(system packages, ~seconds to install) provided a real, working browser.
Playwright cannot drive vanilla `firefox-esr` — it requires its own patched
Firefox build for the juggler protocol — so Firefox e2e coverage could not
be exercised in this sandbox; Chromium coverage is complete and real
(actual page loads against `vite preview` serving the built `dist/`, actual
DOM assertions). A temporary `playwright.local-system-browsers.config.ts`
pointed the `chromium`/`firefox` projects at `/usr/bin/chromium` and
`/usr/bin/firefox-esr`; it was deleted before committing and never entered
git history (`git status` was clean of it before `git add`).

## Deviations from Plan

None. Single task, no `PLAN.md` (issue executed directly per orchestrator
instructions).

## Discovered Issues

None found in scope. Firefox e2e coverage is structurally unavailable in
this specific sandbox (network-blocked from Playwright's own Firefox
build) — not a repo defect; CI (which has working access to Playwright's
CDN) will exercise both `chromium` and `firefox` projects as configured in
the committed `playwright.config.ts`, which was not modified.

## Self-Check

- [x] `apps/web/src/App.tsx` — footer links present, matches plan
- [x] `apps/web/tests/e2e/footer-links.spec.ts` — exists, added to git
- [x] Commit `7866fdd` exists on branch
      `issue/impressum-und-datenschutzerklaerung-im-footer-verlinken`
- [x] Full verification suite passes (typecheck, lint, unit, e2e — Chromium)
- [x] No stubs/TODOs/placeholders in changed files
- [x] No leftover debug code; temporary local Playwright config removed
      before commit, confirmed absent from `git status`
- **Result:** PASSED

**Completed:** 2026-09-02T14:50:00Z
**Duration:** ~57 min (majority spent working around the sandbox's
Playwright-browser-download failure, see note above)
**Commits:** 1
