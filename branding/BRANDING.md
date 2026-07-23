# distinctly-core — branding patch set

Fork of `twentyhq/twenty` @ `sdk/v2.22.0` (matches the `twentycrm/twenty:v2.22.0` image the
`distinctly` app runs). Goal: match `distinctly/docs/design/distinctlyos-approved-mockup.png`.

## Palette (from branding/distinctlyOS-logo.svg)
- Navy background `#071222` · Teal `#4ED8E5`→`#23C7C8` · white text.

## Files to patch (located 2026-07-23, this ref)
- **Sidebar background → navy:**
  `packages/twenty-front/src/modules/ui/navigation/navigation-drawer/components/NavigationDrawer.tsx`
  (+ its styled container). Force the drawer background to `#071222` and text/icons to light.
- **Accent → teal:** `packages/twenty-ui/src/theme/constants/` — `AccentLight.ts` / `AccentDark.ts`
  (and the blue tokens in `ColorsLight/Dark.ts`) drive the active nav item + CTA color. Point the
  accent at `#23C7C8`. NOTE: theme is CSS-variable based (`var(--t-...)`) via SCSS modules; the
  variable VALUES are generated from these constants — patch the constants, not the .scss.
- **Logo:** the sidebar workspace logo is likely settable via Settings → Workspace (upload
  `distinctlyOS-logo`), which may need NO fork. Confirm; if the header wordmark needs replacing,
  patch `packages/twenty-front/src/modules/auth/components/Logo.tsx` and the workspace header.

## Build & deploy (see distinctly/docs/DISTINCTLY-CORE-FORK.md)
- Build the custom image in **CI** (isolate from the prod box). Tag `distinctly-twenty:v2.22.0-b1`.
- Repoint `distinctly/docker/compose.yml` server+worker image → the custom tag, **staging first**,
  verify all pages render + sidebar is navy/branded, then production (gated, backup + rollback ready).

## Maintenance
Rebase this branch onto each new upstream tag; keep patches minimal. Pin the image tag deliberately.
