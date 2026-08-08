// distinctly branding: standard Twenty CRM objects the media product does not
// surface in the sidebar. Their nav items are hidden (the objects stay active so
// no timeline/feature breaks — this is display-only).
//
// This list is shared, not local to the sidebar hook, because the wedged-store
// detector has to reason about the same thing the sidebar renders. Every entry
// added here removes a nav item from the sidebar, so a store holding *only*
// items backed by these objects renders an empty sidebar while every metadata
// collection still looks populated — see getWedgedMetadataEntityKeys.
export const DISTINCTLY_HIDDEN_OBJECT_NAMES: readonly string[] = [
  'task',
  'note',
  'dashboard',
  'opportunity',
];
