import {
  ALL_METADATA_ENTITY_KEYS,
  type MetadataEntityKey,
  type MetadataStoreItem,
} from '@/metadata-store/states/metadataStoreState';

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
};

export const hasWedgedMetadataEntityKeys = ({
  unconvergedEntityKeys,
  emptyCriticalEntityKeys,
}: WedgedMetadataEntityKeys): boolean =>
  unconvergedEntityKeys.length > 0 || emptyCriticalEntityKeys.length > 0;

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
});
