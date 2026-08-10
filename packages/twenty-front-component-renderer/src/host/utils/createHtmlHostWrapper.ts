import React, { useContext } from 'react';

import { FrontComponentFileUploadContext } from '@/host/contexts/FrontComponentFileUploadContext';
import { FrontComponentInputFocusContext } from '@/host/contexts/FrontComponentInputFocusContext';
import { createFileUploadChangeHandler, isFileUploadInput } from '@/host/utils/createFileUploadChangeHandler';
import { createCaretPreservingElement } from '@/host/utils/createCaretPreservingElement';
import { filterProps } from '@/host/utils/filterProps';
import { isTextLikeInputType } from '@/host/utils/isTextLikeInputType';
import { sanitizeIframeSandbox } from '@/host/utils/sanitizeIframeSandbox';

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

type WrapperProps = { children?: React.ReactNode } & Record<string, unknown>;

export const createHtmlHostWrapper = (htmlTag: string) => {
  const isVoid = VOID_ELEMENTS.has(htmlTag);
  const isIframe = htmlTag === 'iframe';
  const isForm = htmlTag === 'form';

  return ({ children, ...props }: WrapperProps) => {
    const setEditableFocused = useContext(FrontComponentInputFocusContext);
    const uploadAttachment = useContext(FrontComponentFileUploadContext);
    const reactProps = filterProps(props, htmlTag);

    // An opted-in <input type="file"> uploads on the HOST, where the File is real. Everything
    // else about the element is unchanged. Without this the picked file reaches the worker as
    // {name, size, type, lastModified} — serializeEvent cannot carry bytes — and no code in the
    // worker can recover them, which is why three attempts to read them there failed.
    if (isFileUploadInput(htmlTag, props)) {
      return React.createElement(htmlTag, {
        ...reactProps,
        onChange: createFileUploadChangeHandler(
          reactProps.onChange,
          uploadAttachment,
          props,
        ),
      });
    }

    const forcedProps: Record<string, unknown> | undefined = isIframe
      ? { sandbox: sanitizeIframeSandbox(reactProps.sandbox) }
      : isForm
        ? {
            // The remote component's onSubmit is forwarded asynchronously across
            // the remote-dom boundary, so its preventDefault lands too late to
            // stop a native form submission (which navigates and closes the
            // page). Guard synchronously on the host while still forwarding the
            // event to the remote handler. (React 19 also blocks the previous
            // `action="javascript:void(0)"` guard.)
            onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const remoteOnSubmit = reactProps.onSubmit;
              // The remote prop is untrusted across the remote-dom boundary, so
              // it may not be a function — guard before invoking.
              if (typeof remoteOnSubmit === 'function') {
                (
                  remoteOnSubmit as (
                    event: React.FormEvent<HTMLFormElement>,
                  ) => void
                )(event);
              }
            },
          }
        : undefined;

    if (
      htmlTag === 'textarea' ||
      (htmlTag === 'input' && isTextLikeInputType(reactProps.type))
    ) {
      return createCaretPreservingElement(
        htmlTag,
        reactProps,
        forcedProps,
        setEditableFocused,
      );
    }

    return React.createElement(
      htmlTag,
      { ...reactProps, ...forcedProps },
      isVoid ? undefined : children,
    );
  };
};
