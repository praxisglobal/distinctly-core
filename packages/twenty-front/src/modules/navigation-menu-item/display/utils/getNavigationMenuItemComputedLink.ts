import { getLinkNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/link/utils/getLinkNavigationMenuItemComputedLink';
import { getObjectNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/object/utils/getObjectNavigationMenuItemComputedLink';
import { getPageLayoutNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/page-layout/utils/getPageLayoutNavigationMenuItemComputedLink';
import { getRecordNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/record/utils/getRecordNavigationMenuItemComputedLink';
import { getViewNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/view/utils/getViewNavigationMenuItemComputedLink';
import { DISTINCTLY_MODULE_INDEX_ROUTES } from '@/navigation-menu-item/distinctly/distinctlyModuleIndexRoutes';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type View } from '@/views/types/View';
import { isNonEmptyString } from '@sniptt/guards';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

export const getNavigationMenuItemComputedLink = ({
  item,
  objectMetadataItems,
  views,
  lastVisitedViewPerObjectMetadataItem,
}: {
  item: NavigationMenuItem;
  objectMetadataItems: EnrichedObjectMetadataItem[];
  views: Pick<View, 'id' | 'objectMetadataId' | 'key'>[];
  lastVisitedViewPerObjectMetadataItem?: Record<string, string> | null;
}): string => {
  switch (item.type) {
    case NavigationMenuItemType.OBJECT: {
      const lastVisitedViewId = isDefined(item.targetObjectMetadataId)
        ? lastVisitedViewPerObjectMetadataItem?.[item.targetObjectMetadataId]
        : undefined;

      return getObjectNavigationMenuItemComputedLink(
        item,
        objectMetadataItems,
        views,
        lastVisitedViewId,
      );
    }
    case NavigationMenuItemType.VIEW:
      return getViewNavigationMenuItemComputedLink(
        item,
        objectMetadataItems,
        views,
      );
    case NavigationMenuItemType.LINK:
      return getLinkNavigationMenuItemComputedLink(item);
    case NavigationMenuItemType.RECORD:
      return getRecordNavigationMenuItemComputedLink(item, objectMetadataItems);
    case NavigationMenuItemType.PAGE_LAYOUT: {
      // distinctly: a redesigned module links to its readable object index route
      // (/objects/<namePlural>), where the fork renders the module's custom page-layout,
      // instead of the opaque /page/<uuid>. See distinctlyModuleIndexRoutes.
      const distinctlyModuleObjectNamePlural = isNonEmptyString(item.name)
        ? DISTINCTLY_MODULE_INDEX_ROUTES[item.name]
        : undefined;

      if (isNonEmptyString(distinctlyModuleObjectNamePlural)) {
        return `/objects/${distinctlyModuleObjectNamePlural}`;
      }

      return getPageLayoutNavigationMenuItemComputedLink(item);
    }
    default:
      return '';
  }
};
