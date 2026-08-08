import {
  ALL_METADATA_ENTITY_KEYS,
  type MetadataEntityKey,
  type MetadataStoreItem,
} from '@/metadata-store/states/metadataStoreState';
import { DISTINCTLY_HIDDEN_OBJECT_NAMES } from '@/navigation-menu-item/common/constants/DistinctlyHiddenObjectNames';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

type NavigationMenuItemLike = {
  type?: string | null;
  viewId?: string | null;
  pageLayoutId?: string | null;
  targetObjectMetadataId?: string | null;
};

type ViewLike = { id?: string | null; objectMetadataId?: string | null };

type ObjectMetadataItemLike = { id?: string | null; nameSingular?: string };

type PageLayoutLike = { id?: string | null };

// distinctly branding: collections without which no sidebar can be rendered. A
// provisioned workspace always has all three, so an empty one after a completed
// load means the persisted store is broken, not that the workspace is empty.
export const SIDEBAR_CRITICAL_METADATA_ENTITY_KEYS = [
  'objectMetadataItems',
  'views',
  'navigationMenuItems',
] as const satisfies readonly MetadataEntityKey[];

export type WedgedMetadataEntityKeys = {
  unconvergedEntityKeys: MetadataEntityKey[];
  emptyCriticalEntityKeys: MetadataEntityKey[];
  hasOnlyDanglingNavigationMenuItems: boolean;
  hasNoRenderableNavigationMenuItems: boolean;
};

export const hasWedgedMetadataEntityKeys = ({
  unconvergedEntityKeys,
  emptyCriticalEntityKeys,
  hasOnlyDanglingNavigationMenuItems,
  hasNoRenderableNavigationMenuItems,
}: WedgedMetadataEntityKeys): boolean =>
  unconvergedEntityKeys.length > 0 ||
  emptyCriticalEntityKeys.length > 0 ||
  hasOnlyDanglingNavigationMenuItems ||
  hasNoRenderableNavigationMenuItems;

// A nav item is rendered only if the store also holds what backs it, so a store
// whose views/objects are older than its nav items renders an empty sidebar even
// though every collection looks 'up-to-date'. Requiring that *every* backed item
// dangles keeps this from firing on a single item the server withheld (a
// permission-filtered object, say) — all of them dangling is only ever a broken
// store.
const getHasOnlyDanglingNavigationMenuItems = (
  navigationMenuItems: NavigationMenuItemLike[],
  views: ViewLike[],
  objectMetadataItems: ObjectMetadataItemLike[],
): boolean => {
  const viewIds = new Set(views.map((view) => view.id).filter(isDefined));
  const objectMetadataItemIds = new Set(
    objectMetadataItems.map((item) => item.id).filter(isDefined),
  );

  const backedItems = navigationMenuItems.filter(
    (item) =>
      (item.type === NavigationMenuItemType.VIEW && isDefined(item.viewId)) ||
      ((item.type === NavigationMenuItemType.OBJECT ||
        item.type === NavigationMenuItemType.RECORD) &&
        isDefined(item.targetObjectMetadataId)),
  );

  if (backedItems.length === 0) {
    return false;
  }

  return backedItems.every((item) =>
    item.type === NavigationMenuItemType.VIEW
      ? !viewIds.has(item.viewId as string)
      : !objectMetadataItemIds.has(item.targetObjectMetadataId as string),
  );
};

// distinctly branding: the checks above count *collections*, and that stopped
// being a proxy for "the sidebar has entries" once the branding filter began
// hiding the standard Twenty objects (Tasks/Notes/Dashboards/Opportunities —
// see DISTINCTLY_HIDDEN_OBJECT_NAMES).
//
// The store that produced the report this was written for held exactly the four
// hidden standard-object nav items and none of distinctly's nine PAGE_LAYOUT
// entries: navigationMenuItems was non-empty, so nothing looked 'empty'; the
// four resolved to live objects, so nothing looked 'dangling'; nothing was
// 'draft-pending'. Every existing check passed while the user stared at a
// sidebar with no entries at all, and because the store is persisted in
// IndexedDB it survived every hard refresh.
//
// So count what the sidebar will actually put on screen instead. PAGE_LAYOUT
// items are included here — they are absent from the dangling check above, and
// they are the only entries distinctly's own sidebar has.
const getRenderableNavigationMenuItemCount = (
  navigationMenuItems: NavigationMenuItemLike[],
  views: ViewLike[],
  objectMetadataItems: ObjectMetadataItemLike[],
  pageLayouts: PageLayoutLike[],
): number => {
  const viewsById = new Map<string, ViewLike>(
    views
      .filter((view): view is ViewLike & { id: string } => isDefined(view.id))
      .map((view) => [view.id, view]),
  );
  const objectsById = new Map<string, ObjectMetadataItemLike>(
    objectMetadataItems
      .filter(
        (item): item is ObjectMetadataItemLike & { id: string } =>
          isDefined(item.id),
      )
      .map((item) => [item.id, item]),
  );
  const pageLayoutIds = new Set<string>(
    pageLayouts.map((pageLayout) => pageLayout.id).filter(isDefined),
  );

  const isHiddenObjectId = (objectMetadataId?: string | null): boolean => {
    if (!isDefined(objectMetadataId)) {
      return false;
    }

    const nameSingular = objectsById.get(objectMetadataId)?.nameSingular;

    return (
      isDefined(nameSingular) &&
      DISTINCTLY_HIDDEN_OBJECT_NAMES.includes(nameSingular)
    );
  };

  const renderableItems = navigationMenuItems.filter((item) => {
    // A folder renders only as a container for children counted in their own
    // right, so it is never evidence that the sidebar has something on it.
    if (item.type === NavigationMenuItemType.FOLDER) {
      return false;
    }

    if (item.type === NavigationMenuItemType.LINK) {
      return true;
    }

    if (item.type === NavigationMenuItemType.PAGE_LAYOUT) {
      return (
        isDefined(item.pageLayoutId) && pageLayoutIds.has(item.pageLayoutId)
      );
    }

    if (
      item.type === NavigationMenuItemType.OBJECT ||
      item.type === NavigationMenuItemType.RECORD
    ) {
      return (
        isDefined(item.targetObjectMetadataId) &&
        objectsById.has(item.targetObjectMetadataId) &&
        !isHiddenObjectId(item.targetObjectMetadataId)
      );
    }

    if (item.type === NavigationMenuItemType.VIEW) {
      if (!isDefined(item.viewId)) {
        return false;
      }

      const view = viewsById.get(item.viewId);

      return (
        isDefined(view) &&
        isDefined(view.objectMetadataId) &&
        objectsById.has(view.objectMetadataId) &&
        !isHiddenObjectId(view.objectMetadataId)
      );
    }

    return false;
  });

  return renderableItems.length;
};

// A metadata store that finished a load cycle should have every collection
// 'up-to-date'. One left 'draft-pending' means its draft was fetched but never
// promoted — `applyChanges` refuses to promote views that reference objects the
// current store does not have — and because the collection hash is only recorded
// on promotion, the same load fails identically on every subsequent reload. That
// state is persisted in IndexedDB, so it outlives refreshes and sign-out.
export const getWedgedMetadataEntityKeys = (
  getEntry: (key: MetadataEntityKey) => MetadataStoreItem,
): WedgedMetadataEntityKeys => {
  const navigationMenuItems = getEntry('navigationMenuItems')
    .current as NavigationMenuItemLike[];
  const views = getEntry('views').current as ViewLike[];
  const objectMetadataItems = getEntry('objectMetadataItems')
    .current as ObjectMetadataItemLike[];
  const pageLayouts = getEntry('pageLayouts').current as PageLayoutLike[];

  return {
    unconvergedEntityKeys: ALL_METADATA_ENTITY_KEYS.filter(
      (key) => getEntry(key).status === 'draft-pending',
    ),
    emptyCriticalEntityKeys: SIDEBAR_CRITICAL_METADATA_ENTITY_KEYS.filter(
      (key) => getEntry(key).current.length === 0,
    ),
    hasOnlyDanglingNavigationMenuItems: getHasOnlyDanglingNavigationMenuItems(
      navigationMenuItems,
      views,
      objectMetadataItems,
    ),
    // Only meaningful once there is something to filter: an empty collection is
    // already reported by emptyCriticalEntityKeys, and reporting it twice would
    // muddy the log line that says which check fired.
    hasNoRenderableNavigationMenuItems:
      navigationMenuItems.length > 0 &&
      getRenderableNavigationMenuItemCount(
        navigationMenuItems,
        views,
        objectMetadataItems,
        pageLayouts,
      ) === 0,
  };
};
