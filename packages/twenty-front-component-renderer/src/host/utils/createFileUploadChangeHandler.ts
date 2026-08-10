import { serializeEvent } from '@/host/utils/serializeEvent';
import {
  type FrontComponentUploadResult,
  type UploadAttachmentFromFrontComponent,
} from '@/host/contexts/FrontComponentFileUploadContext';
import { type SerializedEventData } from '@/types/SerializedEventData';

/**
 * Opt-in marker. A front component adds `data-front-component-upload="attachment"` to its
 * `<input type="file">` to say "upload this on the host". Without it nothing changes: the input
 * behaves exactly as it does today, and its change event serialises to file METADATA only.
 *
 * Opt-in rather than automatic on purpose — a front component may legitimately use a file input
 * for something that is not an attachment, and silently uploading whatever a user picks would be
 * a surprising side effect of rendering an element.
 */
export const FRONT_COMPONENT_UPLOAD_ATTRIBUTE = 'data-front-component-upload';
export const FRONT_COMPONENT_UPLOAD_TARGET_OBJECT =
  'data-front-component-upload-target-object';
export const FRONT_COMPONENT_UPLOAD_TARGET_RECORD =
  'data-front-component-upload-target-record';

export const isFileUploadInput = (
  htmlTag: string,
  props: Record<string, unknown>,
): boolean =>
  htmlTag === 'input' &&
  props.type === 'file' &&
  props[FRONT_COMPONENT_UPLOAD_ATTRIBUTE] === 'attachment';

/**
 * Wraps the remote onChange for an opted-in file input so the upload happens HERE, where the File
 * is real, and only a serialisable result crosses back into the worker.
 *
 * The remote handler is still called — once, after the upload settles — with the event it would
 * normally receive (file metadata via serializeEvent) plus an `upload` field carrying the outcome.
 * That keeps the front component's existing code path intact: it already reads
 * event.target.files[0].name to show what the user picked, and now it also learns whether the
 * upload succeeded, without ever touching bytes.
 *
 * A failed upload is reported, never thrown: the handler runs inside a DOM event on the host, and
 * an unhandled rejection there surfaces nowhere the user or the front component can see.
 */
export const createFileUploadChangeHandler =
  (
    remoteOnChange: unknown,
    uploadAttachment: UploadAttachmentFromFrontComponent | null,
    props: Record<string, unknown>,
  ) =>
  async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const callRemote = (upload?: FrontComponentUploadResult) => {
      if (typeof remoteOnChange !== 'function') {
        return;
      }
      const serialized: SerializedEventData & {
        upload?: FrontComponentUploadResult;
      } = serializeEvent(event);
      if (upload !== undefined) {
        serialized.upload = upload;
      }
      (remoteOnChange as (detail: SerializedEventData) => void)(serialized);
    };

    const file = event.target.files?.[0];

    // No file (the user cancelled the picker) or no host capability wired: behave exactly as an
    // ordinary file input would, so this can never make things worse than not being here.
    if (!file || uploadAttachment === null) {
      callRemote();
      return;
    }

    // Read everything needed off the event BEFORE awaiting. React pools/reuses synthetic events,
    // and `event.target.files` is not guaranteed to survive the await.
    const { name, size, type } = file;
    const targetObjectNameSingular = props[
      FRONT_COMPONENT_UPLOAD_TARGET_OBJECT
    ] as string | undefined;
    const targetRecordId = props[FRONT_COMPONENT_UPLOAD_TARGET_RECORD] as
      | string
      | undefined;

    // Tell the component the upload has STARTED, before awaiting. The host owns the work, so this
    // is the only moment a front component can learn to show "uploading…" — otherwise its first
    // news of the file is that the upload already finished.
    callRemote({ status: 'uploading', name, size, type });

    try {
      const result = await uploadAttachment({
        file,
        targetObjectNameSingular,
        targetRecordId,
      });
      callRemote(result);
    } catch (error) {
      callRemote({
        status: 'error',
        name,
        size,
        type,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
