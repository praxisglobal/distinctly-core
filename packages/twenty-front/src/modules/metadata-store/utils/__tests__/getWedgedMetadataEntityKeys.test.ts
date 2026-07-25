import {
  type MetadataEntityKey,
  type MetadataStoreItem,
} from '@/metadata-store/states/metadataStoreState';
import {
  getWedgedMetadataEntityKeys,
  hasWedgedMetadataEntityKeys,
} from '@/metadata-store/utils/getWedgedMetadataEntityKeys';

const HEALTHY_ENTRY: MetadataStoreItem = {
  current: [{ id: 'some-id' }],
  draft: [],
  status: 'up-to-date',
};

const createGetEntry =
  (overrides: Partial<Record<MetadataEntityKey, MetadataStoreItem>> = {}) =>
  (key: MetadataEntityKey): MetadataStoreItem =>
    overrides[key] ?? HEALTHY_ENTRY;

describe('getWedgedMetadataEntityKeys', () => {
  it('should report nothing wedged when every collection is up to date and populated', () => {
    const wedged = getWedgedMetadataEntityKeys(createGetEntry());

    expect(wedged.unconvergedEntityKeys).toEqual([]);
    expect(wedged.emptyCriticalEntityKeys).toEqual([]);
    expect(hasWedgedMetadataEntityKeys(wedged)).toBe(false);
  });

  it('should report a collection left in draft-pending after the load cycle', () => {
    const wedged = getWedgedMetadataEntityKeys(
      createGetEntry({
        views: {
          current: [{ id: 'stale-view' }],
          draft: [{ id: 'fresh-view' }],
          status: 'draft-pending',
        },
      }),
    );

    expect(wedged.unconvergedEntityKeys).toEqual(['views']);
    expect(hasWedgedMetadataEntityKeys(wedged)).toBe(true);
  });

  it('should report an empty sidebar-critical collection', () => {
    const wedged = getWedgedMetadataEntityKeys(
      createGetEntry({
        navigationMenuItems: { current: [], draft: [], status: 'up-to-date' },
      }),
    );

    expect(wedged.emptyCriticalEntityKeys).toEqual(['navigationMenuItems']);
    expect(hasWedgedMetadataEntityKeys(wedged)).toBe(true);
  });

  it('should not treat an empty non-critical collection as wedged', () => {
    const wedged = getWedgedMetadataEntityKeys(
      createGetEntry({
        webhooks: { current: [], draft: [], status: 'up-to-date' },
      }),
    );

    expect(hasWedgedMetadataEntityKeys(wedged)).toBe(false);
  });
});
