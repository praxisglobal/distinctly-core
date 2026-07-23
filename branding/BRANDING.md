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

## Patch log
- **v1 (accent → teal):** `SecondaryColors{Light,Dark}.ts` blue1-12 and `Accent{Light,Dark}.ts`
  accent1-12 retargeted from Radix indigo → Radix teal. This recolors the active nav item, CTAs
  and accents to teal (brand `#23C7C8`). Low risk; validates the fork→CI-build→staging loop.
- **NEXT (sidebar → navy):** scope `NavigationDrawer.tsx` to dark colors on a navy `#071222`
  background (dark sidebar + light content, two-tone shell). Needs the CI-build + staging visual
  loop to iterate — text/icon legibility on navy requires overriding the sidebar's font/icon
  colors, not just the background. Do AFTER the accent build proves the pipeline.

## CI build
`.github/workflows/build-distinctly-image.yaml` builds this branch's image via Twenty's own
Dockerfile (`packages/twenty-docker/twenty/Dockerfile`, target `twenty`) and pushes to
`ghcr.io/praxisglobal/distinctly-twenty:v2.22.0-<suffix>`. Front build needs ~8GB RAM — a
standard runner may OOM; use a larger runner if so. Enable Actions on the fork to run it.
