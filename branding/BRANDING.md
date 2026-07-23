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
- **v2 (navy sidebar) DONE:** NavigationDrawer outer container bg #071222 + `dark` class (scopes theme-dark.css vars → light text/icons). Two-tone shell. Pushed 0aaa784.
- **NEXT (logo header size + nav chrome):** scope `NavigationDrawer.tsx` to dark colors on a navy `#071222`
  background (dark sidebar + light content, two-tone shell). Needs the CI-build + staging visual
  loop to iterate — text/icon legibility on navy requires overriding the sidebar's font/icon
  colors, not just the background. Do AFTER the accent build proves the pipeline.

## CI build
`.github/workflows/build-distinctly-image.yaml` builds this branch's image via Twenty's own
Dockerfile (`packages/twenty-docker/twenty/Dockerfile`, target `twenty`) and pushes to
`ghcr.io/praxisglobal/distinctly-twenty:v2.22.0-<suffix>`. Front build needs ~8GB RAM — a
standard runner may OOM; use a larger runner if so. Enable Actions on the fork to run it.

## THE COMPLETE GOAL (full sidebar spec — this is the target, not just teal accents)

Approved mockup: `distinctly/docs/design/distinctlyos-approved-mockup.png`. The fork builds
toward ALL of this, iteratively:

1. **Dark navy sidebar background** (`#071222`) — the whole drawer, two-tone shell (navy sidebar +
   light content).
2. **distinctlyOS logo in the header** — white/teal wordmark on navy.
3. **Two-line nav items** — label + subtitle ("Sales / Manage sales"). Needs a NavigationDrawerItem
   patch + a subtitle source (hard-map by module in the fork; the app SDK has no subtitle field).
4. **Colored icons per module** — each module its own accent color.
5. **Active state** — teal/green highlight + a left border on the active item.
6. **Badge** — red count badge (e.g. Today).
7. **+ New button** — teal.
8. **Search bar** with ⌘K.
9. **User profile at bottom** — avatar, name, email, chevron.

### Build order (each step ships + is verified on staging before the next)
- ✅ **Step 1 — teal accent** (done; proves the CI→staging pipeline).
- **Step 2 — dark navy sidebar** (background + light text/icons; scope NavigationDrawer to dark on
  `#071222`). The big visual shift.
- **Step 3 — logo in header** (may be a workspace-settings upload; else patch the header).
- **Step 4 — nav item chrome** — two-line subtitles, per-module icon colors, active left-border.
- **Step 5 — top/bottom chrome** — +New (teal), search ⌘K, user profile block, badges.

Steps 3–5 include the High-effort items (subtitles, badges) from DISTINCTLY-CORE-FORK.md §1; decide
per item after seeing each build.
