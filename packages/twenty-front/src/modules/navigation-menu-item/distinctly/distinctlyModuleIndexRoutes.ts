// distinctly branding: redesigned modules whose custom page-layout renders AT the
// object's readable index route (/objects/<namePlural>) instead of Twenty's default
// record table — so the sidebar link, the record-page breadcrumb, and the URL bar all
// resolve to one clean, designed home per module.
//
// Keyed by the module's navigationMenuItem NAME -> the object's namePlural (the readable
// slug in /objects/<namePlural>). The page-layout id itself is env-specific (staging vs
// prod DBs differ), so it is NOT hard-coded here: it is resolved at runtime from the
// module's PAGE_LAYOUT nav item (which `yarn twenty apply` sets correctly per environment).
//
// Add one entry per module as it is redesigned to the customer prototype.
export const DISTINCTLY_MODULE_INDEX_ROUTES: Record<string, string> = {
  Projects: 'projects',
};

// namePlural -> module (navigationMenuItem name), the reverse lookup used by the route.
export const distinctlyModuleNameForObjectNamePlural = (
  objectNamePlural: string,
): string | undefined =>
  Object.keys(DISTINCTLY_MODULE_INDEX_ROUTES).find(
    (moduleName) => DISTINCTLY_MODULE_INDEX_ROUTES[moduleName] === objectNamePlural,
  );
