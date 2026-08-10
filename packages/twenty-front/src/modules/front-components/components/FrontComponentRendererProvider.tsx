import { useCallback } from 'react';
import {
  FrontComponentFileUploadContext,
  FrontComponentInputFocusContext,
} from 'twenty-front-component-renderer';

import { FrontComponentInputFocusCleanupEffect } from '@/front-components/components/FrontComponentInputFocusCleanupEffect';
import { useFrontComponentAttachmentUpload } from '@/front-components/hooks/useFrontComponentAttachmentUpload';
import { FrontComponentInstanceContext } from '@/front-components/states/contexts/FrontComponentInstanceContext';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';

type FrontComponentRendererProviderProps = {
  frontComponentId: string;
  children: React.ReactNode;
};

export const FrontComponentRendererProvider = ({
  frontComponentId,
  children,
}: FrontComponentRendererProviderProps) => {
  const focusId = `front-component-input-focus-${frontComponentId}`;

  // Host-side attachment upload. Front components run in a Web Worker over Remote DOM and can
  // never receive a real File; this hands the host's genuine one to Twenty's own uploader and
  // returns only serialisable metadata. Injected the same way setEditableFocused is, so the
  // renderer package stays independent of this application.
  const uploadAttachment = useFrontComponentAttachmentUpload();
  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();

  const setEditableFocused = useCallback(
    (focused: boolean) => {
      if (focused) {
        pushFocusItemToFocusStack({
          focusId,
          component: {
            type: FocusComponentType.TEXT_INPUT,
            instanceId: focusId,
          },
          globalHotkeysConfig: {
            enableGlobalHotkeysConflictingWithKeyboard: false,
          },
        });
      } else {
        removeFocusItemFromFocusStackById({ focusId });
      }
    },
    [focusId, pushFocusItemToFocusStack, removeFocusItemFromFocusStackById],
  );

  return (
    <FrontComponentInstanceContext.Provider
      value={{ instanceId: frontComponentId }}
    >
      <FrontComponentInputFocusContext.Provider value={setEditableFocused}>
        <FrontComponentFileUploadContext.Provider value={uploadAttachment}>
          <FrontComponentInputFocusCleanupEffect focusId={focusId} />
          {children}
        </FrontComponentFileUploadContext.Provider>
      </FrontComponentInputFocusContext.Provider>
    </FrontComponentInstanceContext.Provider>
  );
};
