# Custom sidebar rebuild (full — user chose exact-match over pragmatic)

Goal: `distinctly/docs/design/this_is_the_menu-goal.png`. Replace Twenty's data-driven nav
tree with a bespoke sidebar. Confirmed 2026-07-24 the incremental restyle can't reach the
goal (Twenty renders a compact list; subtitles show inline-truncated "label · sub", icons
stay small).

## What the goal needs (bespoke)
1. Header: "D distinctlyOS" logo (large, white/teal on navy).
2. `+ New` button (teal outline).
3. Search input `Search... ⌘K` (rounded, in-sidebar).
4. LinoBot item (AI Assistant) + robot icon.
5. Module items: LARGE rounded colored icon tile (~44px) + two-line label/subtitle,
   ~64px rows, generous spacing. Per-module color.
6. Today: red count badge (2160).
7. Active item: teal/green fill + rounded + left accent.
8. User profile block at bottom: avatar + name + email + chevron.

## Approach (data-driven for routing, custom for render)
- Keep the patched `NavigationDrawer` (navy shell).
- Replace `MainNavigationDrawer`'s content (tabs row + `MainNavigationDrawerNavigationContent`)
  with a custom `DistinctlyMainNavigation` component.
- Routes: resolve from the REAL nav items (`useSortedNavigationMenuItems` +
  filterAndSortNavigationMenuItems) matched by label — do NOT hardcode workspace-specific
  page-layout/view IDs. Fall back to `/objects/<plural>` for standard objects.
- Profile: `currentWorkspaceMemberState`.
- Module cosmetics (icon, color, subtitle, badge): a config keyed by label.

## Key files
- Swap in: `packages/twenty-front/src/modules/navigation/components/MainNavigationDrawer.tsx`
- New: `.../MainNavigationDrawer/DistinctlyMainNavigation.tsx` (custom render)
- Data: `.../navigation-menu-item/display/hooks/useSortedNavigationMenuItems.ts`
- Profile: `.../auth/states/currentWorkspaceMemberState.ts`
- Icons: `twenty-ui/icon`

## Iteration plan (each = CI build ~10min + staging verify; do NOT ship a broken nav)
1. Custom module list render (large colored tiles + two-line + active + Today badge),
   routed via real nav items. Verify navigation still works.
2. Header logo + `+ New` + search input.
3. LinoBot + user profile block.
4. Spacing/polish to match the mockup.

## Maintenance
Fully custom — must be re-applied + re-tested on every Twenty upgrade (heavier than the theme
patches). Keep the custom component isolated; keep a fallback to Twenty's MainNavigationDrawer.
