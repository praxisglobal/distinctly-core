import { isDefined } from 'twenty-shared/utils';

import { type NavigationMenuItem } from '~/generated-metadata/graphql';

import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { flattenNavigationMenuItemsWithFolderChildren } from '@/navigation-menu-item/common/utils/flattenNavigationMenuItemsWithFolderChildren';
import { getObjectMetadataForNavigationMenuItem } from '@/navigation-menu-item/display/object/utils/getObjectMetadataForNavigationMenuItem';
import { getWorkspaceSidebarOrphanItemsInDisplayOrder } from '@/navigation-menu-item/display/utils/getWorkspaceSidebarOrphanItemsInDisplayOrder';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { viewsSelector } from '@/views/states/selectors/viewsSelector';

import { useNavigationMenuItemsByFolder } from '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder';
import { useNavigationMenuItemsData } from './useNavigationMenuItemsData';
import { useSortedNavigationMenuItems } from './useSortedNavigationMenuItems';

export type NavigationMenuItemClickParams = {
  item: NavigationMenuItem;
  objectMetadataItem?: EnrichedObjectMetadataItem | null;
};

// distinctly branding: standard Twenty CRM objects the media product does not
// surface in the sidebar. Their nav items are hidden (objects stay active so
// no timeline/feature breaks — this is display-only).
const DISTINCTLY_HIDDEN_OBJECT_NAMES = [
  'task',
  'note',
  'dashboard',
  'opportunity',
];

export const useNavigationMenuItemSectionItems = (): NavigationMenuItem[] => {
  const { workspaceNavigationMenuItems } = useNavigationMenuItemsData();
  const { workspaceNavigationMenuItemsSorted } = useSortedNavigationMenuItems();
  const { workspaceNavigationMenuItemsByFolder } =
    useNavigationMenuItemsByFolder();
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );
  const views = useAtomStateValue(viewsSelector);
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();

  const flatItems = getWorkspaceSidebarOrphanItemsInDisplayOrder({
    workspaceNavigationMenuItems,
    workspaceNavigationMenuItemsSorted,
    objectMetadataItems,
    views,
    objectPermissionsByObjectMetadataId,
    includeInaccessibleObjectBackedItems: isLayoutCustomizationModeEnabled,
  });

  const flattenedItems = flattenNavigationMenuItemsWithFolderChildren(
    flatItems,
    workspaceNavigationMenuItemsByFolder,
  );

  // distinctly branding: drop nav items backed by hidden standard objects.
  return flattenedItems.filter((item) => {
    const backingObject = getObjectMetadataForNavigationMenuItem(
      item,
      objectMetadataItems,
      views,
    );

    return !(
      isDefined(backingObject) &&
      DISTINCTLY_HIDDEN_OBJECT_NAMES.includes(backingObject.nameSingular)
    );
  });
};
