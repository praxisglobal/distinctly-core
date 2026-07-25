import {
  ALL_METADATA_ENTITY_KEYS,
  type MetadataEntityKey,
  type MetadataStoreItem,
} from '@/metadata-store/states/metadataStoreState';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

type NavigationMenuItemLike = {
  type?: string | null;
  viewId?: string | null;
  targetObjectMetadataId?: string | null;
};

type ViewLike = { id?: string | null; objectMetadataId?: string | null };

type ObjectMetadataItemLike = { id?: string | null };

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
};

export const hasWedgedMetadataEntityKeys = ({
  unconvergedEntityKeys,
  emptyCriticalEntityKeys,
  hasOnlyDanglingNavigationMenuItems,
}: WedgedMetadataEntityKeys): boolean =>
  unconvergedEntityKeys.length > 0 ||
  emptyCriticalEntityKeys.length > 0 ||
  hasOnlyDanglingNavigationMenuItems;

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

// A metadata store that finished a load cycle should have every collection
// 'up-to-date'. One left 'draft-pending' means its draft was fetched but never
// promoted — `applyChanges` refuses to promote views that reference objects the
// current store does not have — and because the collection hash is only recorded
// on promotion, the same load fails identically on every subsequent reload. That
// state is persisted in IndexedDB, so it outlives refreshes and sign-out.
export const getWedgedMetadataEntityKeys = (
  getEntry: (key: MetadataEntityKey) => MetadataStoreItem,
): WedgedMetadataEntityKeys => ({
  unconvergedEntityKeys: ALL_METADATA_ENTITY_KEYS.filter(
    (key) => getEntry(key).status === 'draft-pending',
  ),
  emptyCriticalEntityKeys: SIDEBAR_CRITICAL_METADATA_ENTITY_KEYS.filter(
    (key) => getEntry(key).current.length === 0,
  ),
  hasOnlyDanglingNavigationMenuItems: getHasOnlyDanglingNavigationMenuItems(
    getEntry('navigationMenuItems').current as NavigationMenuItemLike[],
    getEntry('views').current as ViewLike[],
    getEntry('objectMetadataItems').current as ObjectMetadataItemLike[],
  ),
});
