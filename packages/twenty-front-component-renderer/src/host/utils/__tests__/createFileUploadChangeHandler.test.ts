import {
  createFileUploadChangeHandler,
  isFileUploadInput,
} from '@/host/utils/createFileUploadChangeHandler';
import { type FrontComponentUploadResult } from '@/host/contexts/FrontComponentFileUploadContext';

/**
 * The boundary these tests defend: a front component runs in a Web Worker over Remote DOM, so a
 * picked file reaches it as {name, size, type, lastModified} and nothing else — measured live on
 * 2026-08-10 as `arrayBuffer=no stream=no text=no slice=no isBlob=no`. The File is real only on
 * the host. So the load-bearing assertions here are (a) the host consumes the real File, and
 * (b) NOTHING resembling a File or its bytes is handed to the remote handler.
 */

const makeEvent = (file?: File, target: Partial<HTMLInputElement> = {}) =>
  ({
    type: 'change',
    target: {
      tagName: 'INPUT',
      type: 'file',
      value: '',
      files: file ? ([file] as unknown as FileList) : null,
      ...target,
    },
  }) as unknown as React.ChangeEvent<HTMLInputElement>;

const uploadedResult = (name: string): FrontComponentUploadResult => ({
  status: 'uploaded',
  attachmentId: 'attachment-1',
  fileId: 'file-1',
  name,
  size: 12,
  type: 'image/jpeg',
});

describe('isFileUploadInput', () => {
  it('matches only a file input that opted in', () => {
    const optedIn = { type: 'file', 'data-front-component-upload': 'attachment' };
    expect(isFileUploadInput('input', optedIn)).toBe(true);
    // Not opted in: behaves exactly as it does today.
    expect(isFileUploadInput('input', { type: 'file' })).toBe(false);
    // Opt-in on a non-file input, or a non-input element, must not trigger uploads.
    expect(isFileUploadInput('input', { type: 'text', 'data-front-component-upload': 'attachment' })).toBe(false);
    expect(isFileUploadInput('div', optedIn)).toBe(false);
  });
});

describe('createFileUploadChangeHandler', () => {
  it('hands the REAL File to the host capability', async () => {
    const file = new File(['muneca-bytes'], 'muneca.jpg', { type: 'image/jpeg' });
    const upload = jest.fn(async () => uploadedResult('muneca.jpg'));

    await createFileUploadChangeHandler(jest.fn(), upload, {})(makeEvent(file));

    expect(upload).toHaveBeenCalledTimes(1);
    const request = upload.mock.calls[0][0];
    // The same object, not a copy or a descriptor — this is the whole point of the bridge.
    expect(request.file).toBe(file);
    expect(request.file instanceof File).toBe(true);
  });

  it('never gives the remote handler a File, a Blob, or any bytes', async () => {
    const file = new File(['muneca-bytes'], 'muneca.jpg', { type: 'image/jpeg' });
    const remoteOnChange = jest.fn();

    await createFileUploadChangeHandler(
      remoteOnChange,
      async () => uploadedResult('muneca.jpg'),
      {},
    )(makeEvent(file));

    expect(remoteOnChange).toHaveBeenCalledTimes(1);
    const detail = remoteOnChange.mock.calls[0][0];

    // Structured-cloneable, i.e. genuinely serialisable across the worker boundary. If a File or
    // any non-cloneable value leaked in, this throws.
    expect(() => structuredClone(detail)).not.toThrow();

    const containsFileLike = (value: unknown): boolean => {
      if (value instanceof File || value instanceof Blob) return true;
      if (value && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some(containsFileLike);
      }
      return false;
    };
    expect(containsFileLike(detail)).toBe(false);
  });

  it('reports the upload outcome back to the front component', async () => {
    const file = new File(['muneca-bytes'], 'muneca.jpg', { type: 'image/jpeg' });
    const remoteOnChange = jest.fn();

    await createFileUploadChangeHandler(
      remoteOnChange,
      async () => uploadedResult('muneca.jpg'),
      {},
    )(makeEvent(file));

    expect(remoteOnChange.mock.calls[0][0].upload).toEqual(
      expect.objectContaining({ status: 'uploaded', attachmentId: 'attachment-1' }),
    );
  });

  it('forwards the target object/record so the capability is not project-specific', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const upload = jest.fn(async () => uploadedResult('a.png'));

    await createFileUploadChangeHandler(jest.fn(), upload, {
      'data-front-component-upload-target-object': 'product',
      'data-front-component-upload-target-record': 'product-42',
    })(makeEvent(file));

    expect(upload.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        targetObjectNameSingular: 'product',
        targetRecordId: 'product-42',
      }),
    );
  });

  it('reports a failed upload instead of throwing into a DOM event', async () => {
    // An unhandled rejection inside a host DOM handler surfaces nowhere the user or the front
    // component can see it, so the failure has to come back through the same channel.
    const file = new File(['x'], 'muneca.jpg', { type: 'image/jpeg' });
    const remoteOnChange = jest.fn();

    await expect(
      createFileUploadChangeHandler(
        remoteOnChange,
        async () => {
          throw new Error('storage unreachable');
        },
        {},
      )(makeEvent(file)),
    ).resolves.toBeUndefined();

    expect(remoteOnChange.mock.calls[0][0].upload).toEqual(
      expect.objectContaining({ status: 'error', message: 'storage unreachable', name: 'muneca.jpg' }),
    );
  });

  it('degrades to ordinary behaviour when no host capability is wired', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const remoteOnChange = jest.fn();

    await createFileUploadChangeHandler(remoteOnChange, null, {})(makeEvent(file));

    expect(remoteOnChange).toHaveBeenCalledTimes(1);
    expect(remoteOnChange.mock.calls[0][0].upload).toBeUndefined();
  });

  it('does nothing but forward when the user cancels the picker', async () => {
    const upload = jest.fn();
    const remoteOnChange = jest.fn();

    await createFileUploadChangeHandler(remoteOnChange, upload, {})(makeEvent(undefined));

    expect(upload).not.toHaveBeenCalled();
    expect(remoteOnChange).toHaveBeenCalledTimes(1);
  });

  it('survives a front component that passes no onChange at all', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const upload = jest.fn(async () => uploadedResult('a.png'));

    // The remote prop is untrusted across the boundary and may not be a function.
    await expect(
      createFileUploadChangeHandler(undefined, upload, {})(makeEvent(file)),
    ).resolves.toBeUndefined();
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
