import { isNonEmptyString } from '@sniptt/guards';
import { lazy } from 'react';
import { useParams } from 'react-router-dom';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { LazyRoute } from '@/app/components/LazyRoute';
import { DistinctlyModulePageLayoutView } from '@/navigation-menu-item/distinctly/DistinctlyModulePageLayoutView';
import { distinctlyModuleNameForObjectNamePlural } from '@/navigation-menu-item/distinctly/distinctlyModuleIndexRoutes';
import { useNavigationMenuItemsData } from '@/navigation-menu-item/display/hooks/useNavigationMenuItemsData';
import { RecordIndexSkeletonLoader } from '@/object-record/record-index/components/RecordIndexSkeletonLoader';

// distinctly branding: the element mounted at /objects/:objectNamePlural. For a redesigned
// module it renders the module's custom page-layout (the designed list) so the readable
// object route IS the module home; every other object falls through to Twenty's default
// record index unchanged. Fail-safe: any object not in the map, or a mapped module whose
// page-layout can't be resolved, renders the default table — never breaks the index route.
const RecordIndexPage = lazy(() =>
  import('~/pages/object-record/RecordIndexPage').then((module) => ({
    default: module.RecordIndexPage,
  })),
);

export const DistinctlyRecordIndexRoute = () => {
  const { objectNamePlural } = useParams<{ objectNamePlural: string }>();
  const { workspaceNavigationMenuItems } = useNavigationMenuItemsData();

  const moduleName = isNonEmptyString(objectNamePlural)
    ? distinctlyModuleNameForObjectNamePlural(objectNamePlural)
    : undefined;

  if (isNonEmptyString(moduleName)) {
    const moduleNavItem = workspaceNavigationMenuItems.find(
      (item) =>
        item.type === NavigationMenuItemType.PAGE_LAYOUT &&
        item.name === moduleName &&
        isDefined(item.pageLayoutId),
    );

    if (isDefined(moduleNavItem?.pageLayoutId)) {
      return (
        <DistinctlyModulePageLayoutView
          pageLayoutId={moduleNavItem.pageLayoutId}
        />
      );
    }

    // Mapped module, page-layout not resolved yet (nav items still loading): show the
    // loader rather than flashing Twenty's default table for a designed module.
    return <RecordIndexSkeletonLoader />;
  }

  return (
    <LazyRoute fallback={<RecordIndexSkeletonLoader />}>
      <RecordIndexPage />
    </LazyRoute>
  );
};
