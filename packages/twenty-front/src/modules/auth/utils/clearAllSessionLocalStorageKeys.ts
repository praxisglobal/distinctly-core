import { safeRemoveLocalStorageItems } from '@/auth/utils/safeRemoveLocalStorageItems';
import {
  ALL_METADATA_ENTITY_KEYS,
  METADATA_STORE_KEY_PREFIX,
  type MetadataEntityKey,
} from '@/metadata-store/states/metadataStoreState';
import { clearMetadataStoreStorage } from '@/metadata-store/storage/metadataStoreStorage';
import { clearSessionLocalStorageKeys } from './clearSessionLocalStorageKeys';

const getMetadataStoreKeys = (): string[] =>
  ALL_METADATA_ENTITY_KEYS.map(
    (key: MetadataEntityKey) => `${METADATA_STORE_KEY_PREFIX}${key}`,
  );

// distinctly branding: returns the IndexedDB clear so callers that navigate right
// after (sign-out, self-heal reload) can wait for it — a fire-and-forget clear can
// be cut short by the navigation, leaving the stale metadata store in place.
export const clearAllSessionLocalStorageKeys = (): Promise<void> => {
  clearSessionLocalStorageKeys();
  safeRemoveLocalStorageItems(getMetadataStoreKeys());

  return clearMetadataStoreStorage();
};
