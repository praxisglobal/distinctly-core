import { createContext } from 'react';

/**
 * Host-side file upload for front components.
 *
 * Front components execute in a Web Worker over Remote DOM. The `<input type="file">` they render
 * is created by the HOST (see createHtmlHostWrapper), so the host's change event carries a genuine
 * browser `File` — but serializeEvent reduces it to {name, size, type, lastModified} on the way
 * back to the worker, because a File cannot be structured-cloned usefully. Measured in a live
 * sandbox on 2026-08-10, a front component sees:
 *
 *     arrayBuffer=no stream=no text=no slice=no FileReader=yes Blob=yes isBlob=no
 *
 * So the bytes are not lost — they are simply never used on the side that has them. No amount of
 * work inside the worker can recover them; three attempts to do so only changed which line threw.
 *
 * This context is the way out: the host keeps the File and performs the upload itself, and the
 * front component receives a serialisable result. It follows the same injection pattern as
 * FrontComponentInputFocusContext — declared here, implemented by twenty-front — so this package
 * does not need to depend on the application it is embedded in.
 *
 * Deliberately generic. The capability takes a target object/record rather than anything
 * project-specific, so any front component on any record — Projects, Products, Accounts, Members,
 * or a custom object added later — gets attachments from the same code path.
 */
export type FrontComponentUploadRequest = {
  /** The real browser File, which never leaves the host. */
  file: File;
  /** Target record. Omitted means "whatever record this front component is rendered on". */
  targetObjectNameSingular?: string;
  targetRecordId?: string;
};

/** What the front component gets back: serialisable, no File, no bytes. */
export type FrontComponentUploadResult = {
  status: 'uploaded' | 'error';
  attachmentId?: string;
  fileId?: string;
  url?: string;
  name: string;
  size: number;
  type: string;
  /** Present only when status is 'error'. */
  message?: string;
};

export type UploadAttachmentFromFrontComponent = (
  request: FrontComponentUploadRequest,
) => Promise<FrontComponentUploadResult>;

export const FrontComponentFileUploadContext =
  createContext<UploadAttachmentFromFrontComponent | null>(null);
