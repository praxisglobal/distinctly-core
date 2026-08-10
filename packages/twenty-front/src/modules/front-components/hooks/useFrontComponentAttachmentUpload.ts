import { useCallback } from 'react';

import { useUploadAttachmentFile } from '@/activities/files/hooks/useUploadAttachmentFile';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import {
  type FrontComponentUploadRequest,
  type FrontComponentUploadResult,
  type UploadAttachmentFromFrontComponent,
} from 'twenty-front-component-renderer';

/**
 * The host-side half of front-component file upload.
 *
 * Front components execute in a Web Worker over Remote DOM, so the file a user picks reaches them
 * as {name, size, type, lastModified} and nothing more — serializeEvent cannot carry bytes across
 * that boundary. The real File exists only here, in the host's change event. This hook is what the
 * renderer calls with it, and it reuses Twenty's own uploader rather than adding a second upload
 * path: useUploadAttachmentFile -> useDirectFileUpload + createOneRecord(Attachment).
 *
 * Deliberately generic: the target object/record comes from the request, so any front component on
 * any record — Projects, Products, Accounts, Members, or an object added next month — uses this
 * one path. Nothing here knows what a Project is.
 */
export const useFrontComponentAttachmentUpload =
  (): UploadAttachmentFromFrontComponent => {
    const { uploadAttachmentFile } = useUploadAttachmentFile();
    // NOT useTargetRecord(): that throws when there is no record page context, and front
    // components also render on standalone pages. Reading the context directly lets the fallback
    // simply be absent there, which the error path below reports rather than crashing the host.
    const { targetRecordIdentifier } = useLayoutRenderingContext();

    return useCallback(
      async ({
        file,
        targetObjectNameSingular,
        targetRecordId,
      }: FrontComponentUploadRequest): Promise<FrontComponentUploadResult> => {
        const base = { name: file.name, size: file.size, type: file.type };

        // Explicit target wins; otherwise inherit the record this component is rendered on.
        const objectNameSingular =
          targetObjectNameSingular ??
          targetRecordIdentifier?.targetObjectNameSingular;
        const recordId = targetRecordId ?? targetRecordIdentifier?.id;

        if (!objectNameSingular || !recordId) {
          return {
            ...base,
            status: 'error',
            message:
              'No target record for this upload. Render the input on a record page, or set ' +
              'data-front-component-upload-target-object and -target-record on it.',
          };
        }

        try {
          const { attachmentFileId, attachmentAbsoluteURL } =
            await uploadAttachmentFile(file, {
              id: recordId,
              targetObjectNameSingular: objectNameSingular,
            });

          return {
            ...base,
            status: 'uploaded',
            fileId: attachmentFileId,
            url: attachmentAbsoluteURL,
          };
        } catch (error) {
          // Returned, not rethrown: this runs inside a DOM event handler on the host, where an
          // unhandled rejection is invisible to both the user and the front component.
          return {
            ...base,
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          };
        }
      },
      [uploadAttachmentFile, targetRecordIdentifier],
    );
  };
