import { useHasAccessTokenPair } from '@/auth/hooks/useHasAccessTokenPair';
import { useIsOnAuthOrOnboardingPage } from '@/auth/hooks/useIsOnAuthOrOnboardingPage';
import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isCurrentUserLoadedState } from '@/auth/states/isCurrentUserLoadedState';
import { clearAllSessionLocalStorageKeys } from '@/auth/utils/clearAllSessionLocalStorageKeys';
import { useLoadMinimalMetadata } from '@/metadata-store/hooks/useLoadMinimalMetadata';
import { useLoadStaleMetadataEntities } from '@/metadata-store/hooks/useLoadStaleMetadataEntities';
import { metadataLoadedVersionState } from '@/metadata-store/states/metadataLoadedVersionState';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import {
  getWedgedMetadataEntityKeys,
  hasWedgedMetadataEntityKeys,
} from '@/metadata-store/utils/getWedgedMetadataEntityKeys';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useStore } from 'jotai';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { isWorkspaceProvisioned } from 'twenty-shared/workspace';
import { logError } from '~/utils/logError';

// distinctly branding: set once per tab so a store that stays wedged after the
// reload cannot put the app in a reload loop.
const METADATA_SELF_HEAL_SESSION_KEY = 'distinctly:metadata-store-self-healed';

const hasAlreadySelfHealed = (): boolean => {
  try {
    return sessionStorage.getItem(METADATA_SELF_HEAL_SESSION_KEY) === 'true';
  } catch {
    // sessionStorage unavailable — never self-heal rather than risk a reload loop
    return true;
  }
};

const markAsSelfHealed = (): void => {
  try {
    sessionStorage.setItem(METADATA_SELF_HEAL_SESSION_KEY, 'true');
  } catch {
    // handled by hasAlreadySelfHealed returning true in the same situation
  }
};

export const MinimalMetadataLoadEffect = () => {
  const hasAccessTokenPair = useHasAccessTokenPair();
  const isCurrentUserLoaded = useAtomStateValue(isCurrentUserLoadedState);
  const currentUser = useAtomStateValue(currentUserState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const metadataLoadedVersion = useAtomStateValue(metadataLoadedVersionState);
  const [lastLoadedVersion, setLastLoadedVersion] = useState<number>(-1);

  const { loadMinimalMetadata } = useLoadMinimalMetadata();
  const { loadStaleMetadataEntities } = useLoadStaleMetadataEntities();
  const store = useStore();

  const isOnAuthOrOnboardingPage = useIsOnAuthOrOnboardingPage();

  const isProvisionedWorkspace = isWorkspaceProvisioned(currentWorkspace);
  const shouldLoadRealMetadata =
    hasAccessTokenPair && isProvisionedWorkspace && !isOnAuthOrOnboardingPage;

  useEffect(() => {
    if (!isCurrentUserLoaded && !isDefined(currentUser)) {
      return;
    }

    if (!shouldLoadRealMetadata) {
      return;
    }

    if (metadataLoadedVersion === lastLoadedVersion) {
      return;
    }

    const isFirstLoadOfThisTab = lastLoadedVersion === -1;

    setLastLoadedVersion(metadataLoadedVersion);

    const performLoad = async () => {
      const result = await loadMinimalMetadata();

      if (result?.staleEntityKeys && result.staleEntityKeys.length > 0) {
        await loadStaleMetadataEntities(result.staleEntityKeys);
      }

      // distinctly branding: the metadata store is persisted in IndexedDB and
      // nothing in the app clears it, so a store that cannot converge stays
      // broken through refreshes and sign-out — the app renders an empty sidebar
      // and only Incognito or clearing site data recovers it. Detect that state
      // after the boot load and clear the store once, then reload.
      // Only on the tab's first load: later loads run while the user edits
      // metadata in Settings, where 'draft-pending' is a legitimate state.
      if (!isFirstLoadOfThisTab) {
        return;
      }

      const wedgedEntityKeys = getWedgedMetadataEntityKeys((key) =>
        store.get(metadataStoreState.atomFamily(key)),
      );

      if (!hasWedgedMetadataEntityKeys(wedgedEntityKeys)) {
        return;
      }

      const wedgedDescription = `unconverged: [${wedgedEntityKeys.unconvergedEntityKeys.join(', ')}], empty: [${wedgedEntityKeys.emptyCriticalEntityKeys.join(', ')}], allNavigationMenuItemsDangling: ${wedgedEntityKeys.hasOnlyDanglingNavigationMenuItems}`;

      if (hasAlreadySelfHealed()) {
        logError(
          new Error(
            `distinctly: metadata store still wedged after self-heal (${wedgedDescription}) — clear site data for this domain`,
          ),
        );

        return;
      }

      markAsSelfHealed();
      logError(
        new Error(
          `distinctly: wedged metadata store detected (${wedgedDescription}) — clearing the persisted store and reloading`,
        ),
      );

      await clearAllSessionLocalStorageKeys();

      window.location.reload();
    };

    performLoad();
  }, [
    isCurrentUserLoaded,
    currentUser,
    shouldLoadRealMetadata,
    lastLoadedVersion,
    metadataLoadedVersion,
    loadMinimalMetadata,
    loadStaleMetadataEntities,
    store,
  ]);

  return null;
};
