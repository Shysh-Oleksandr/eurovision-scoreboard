'use client';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import {
  formatBytes,
  ImageTooLargeError,
  isAssetSrc,
  storeUploadedImage,
  THEME_BG_SRC,
} from '../../assets/localAssets';
import { MAX_IMAGE_BYTES } from '../../model/presets';
import { Field, Hint, Seg, TextInput } from '../ui/controls';

import Button from '@/components/common/Button';

type SourceKind = 'upload' | 'url' | 'theme';

const kindOf = (src: string): SourceKind =>
  src === THEME_BG_SRC ? 'theme' : isAssetSrc(src) ? 'upload' : 'url';

interface Props {
  src: string;
  onChange: (src: string) => void;
  /** Raised when a file is over the limit (the editor shows the dialog). */
  onTooLarge: (info: { fileName: string; size: number }) => void;
}

/**
 * Source picker for image elements and image backgrounds: Upload (stored
 * locally as an asset), URL (proxied on export), or the theme background.
 */
const ImageSourceField: React.FC<Props> = ({ src, onChange, onTooLarge }) => {
  const t = useTranslations('graphics.inspector.image');
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<SourceKind>(() => kindOf(src));
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(kind === 'url' ? src : '');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await storeUploadedImage(file));
    } catch (err) {
      if (err instanceof ImageTooLargeError) {
        onTooLarge({ fileName: err.fileName, size: err.size });
      } else {
        console.error('Image upload failed', err);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <Field label={t('source')}>
        <Seg<SourceKind>
          value={kind}
          onChange={(k) => {
            setKind(k);
            if (k === 'theme') onChange(THEME_BG_SRC);
            if (k === 'url' && url) onChange(url);
          }}
          options={[
            { value: 'upload', label: t('upload') },
            { value: 'url', label: t('url') },
            { value: 'theme', label: t('themeBackground') },
          ]}
        />
      </Field>

      {kind === 'url' && (
        <Field label={t('imageUrl')}>
          <TextInput
            value={url}
            placeholder="https://…"
            inputMode="url"
            onValue={(v) => {
              setUrl(v);
              if (/^https?:\/\/\S+$/i.test(v.trim())) onChange(v.trim());
            }}
          />
        </Field>
      )}

      {kind === 'upload' && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            variant="surface"
            size="md"
            className="w-full justify-center"
            isLoading={busy}
            Icon={<Upload className="size-4" />}
            onClick={() => inputRef.current?.click()}
          >
            {isAssetSrc(src) ? t('replaceImage') : t('chooseImage')}
          </Button>
          <Hint>{t('uploadHint', { max: formatBytes(MAX_IMAGE_BYTES) })}</Hint>
        </>
      )}
    </>
  );
};

export default ImageSourceField;
