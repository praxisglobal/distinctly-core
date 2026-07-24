import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';

import { DISTINCTLY_MODULE_INDEX_ROUTES } from '@/navigation-menu-item/distinctly/distinctlyModuleIndexRoutes';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

export const getPageLayoutNavigationMenuItemComputedLink = (
  item: Pick<NavigationMenuItem, 'pageLayoutId' | 'name'>,
): string => {
  // distinctly: a redesigned module links to its readable object index route
  // (/objects/<namePlural>), where the fork renders the module's custom page-layout,
  // instead of the opaque /page/<uuid>. Applied here in the leaf so EVERY caller — the
  // sidebar item display and the central dispatcher — gets it. See distinctlyModuleIndexRoutes.
  const distinctlyModuleObjectNamePlural = isNonEmptyString(item.name)
    ? DISTINCTLY_MODULE_INDEX_ROUTES[item.name]
    : undefined;

  if (isNonEmptyString(distinctlyModuleObjectNamePlural)) {
    return `/objects/${distinctlyModuleObjectNamePlural}`;
  }

  if (!isDefined(item.pageLayoutId)) {
    return '';
  }

  return getAppPath(AppPath.PageLayoutPage, {
    pageLayoutId: item.pageLayoutId,
  });
};
