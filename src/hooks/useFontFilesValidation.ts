import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import {
  FONT_ACCEPTED_EXTENSIONS,
  FONT_MAX_FILE_BYTES,
  FONT_MAX_FILE_MB,
  FONT_MAX_FILES,
} from '@/api/fonts';

const extensionOf = (file: File): string =>
  (file.name.split('.').pop() || '').toLowerCase();

/**
 * Client-side pre-checks for font uploads (extension, size, count) so obvious
 * mistakes never leave the browser. The server re-validates by magic bytes.
 */
export function useFontFilesValidation() {
  const t = useTranslations('error.fontUpload');

  const validate = useCallback(
    (files: File[], maxFiles: number = FONT_MAX_FILES) => {
      const errors: string[] = [];
      const valid: File[] = [];

      for (const file of files) {
        if (
          !(FONT_ACCEPTED_EXTENSIONS as readonly string[]).includes(
            extensionOf(file),
          )
        ) {
          errors.push(t('unsupportedType', { name: file.name }));
          continue;
        }
        if (file.size > FONT_MAX_FILE_BYTES) {
          errors.push(
            t('tooLarge', { name: file.name, maxMb: FONT_MAX_FILE_MB }),
          );
          continue;
        }
        valid.push(file);
      }

      if (valid.length > maxFiles) {
        errors.push(t('tooMany', { max: maxFiles }));
        valid.length = maxFiles;
      }

      return { valid, errors };
    },
    [t],
  );

  return { validate };
}
