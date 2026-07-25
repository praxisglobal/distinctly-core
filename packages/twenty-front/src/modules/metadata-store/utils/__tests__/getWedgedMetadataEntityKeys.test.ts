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

// A consistent trio: the nav item points at a view, which points at an object.
const CONSISTENT_ENTRIES: Partial<
  Record<MetadataEntityKey, MetadataStoreItem>
> = {
  navigationMenuItems: {
    current: [{ id: 'nav-1', type: 'VIEW', viewId: 'view-1' }],
    draft: [],
    status: 'up-to-date',
  },
  views: {
    current: [{ id: 'view-1', objectMetadataId: 'object-1' }],
    draft: [],
    status: 'up-to-date',
  },
  objectMetadataItems: {
    current: [{ id: 'object-1' }],
    draft: [],
    status: 'up-to-date',
  },
};

const createGetEntry =
  (overrides: Partial<Record<MetadataEntityKey, MetadataStoreItem>> = {}) =>
  (key: MetadataEntityKey): MetadataStoreItem =>
    overrides[key] ?? CONSISTENT_ENTRIES[key] ?? HEALTHY_ENTRY;

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

  it('should report nav items that all point at views the store does not have', () => {
    const wedged = getWedgedMetadataEntityKeys(
      createGetEntry({
        navigationMenuItems: {
          current: [
            { id: 'nav-1', type: 'VIEW', viewId: 'view-added-by-the-apply' },
          ],
          draft: [],
          status: 'up-to-date',
        },
      }),
    );

    expect(wedged.unconvergedEntityKeys).toEqual([]);
    expect(wedged.emptyCriticalEntityKeys).toEqual([]);
    expect(wedged.hasOnlyDanglingNavigationMenuItems).toBe(true);
    expect(hasWedgedMetadataEntityKeys(wedged)).toBe(true);
  });

  it('should not treat a single dangling nav item among resolvable ones as wedged', () => {
    const wedged = getWedgedMetadataEntityKeys(
      createGetEntry({
        navigationMenuItems: {
          current: [
            { id: 'nav-1', type: 'VIEW', viewId: 'view-1' },
            { id: 'nav-2', type: 'VIEW', viewId: 'view-missing' },
          ],
          draft: [],
          status: 'up-to-date',
        },
      }),
    );

    expect(wedged.hasOnlyDanglingNavigationMenuItems).toBe(false);
    expect(hasWedgedMetadataEntityKeys(wedged)).toBe(false);
  });

  it('should ignore link and folder nav items, which nothing backs', () => {
    const wedged = getWedgedMetadataEntityKeys(
      createGetEntry({
        navigationMenuItems: {
          current: [
            { id: 'nav-1', type: 'LINK' },
            { id: 'nav-2', type: 'FOLDER' },
          ],
          draft: [],
          status: 'up-to-date',
        },
      }),
    );

    expect(wedged.hasOnlyDanglingNavigationMenuItems).toBe(false);
    expect(hasWedgedMetadataEntityKeys(wedged)).toBe(false);
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
