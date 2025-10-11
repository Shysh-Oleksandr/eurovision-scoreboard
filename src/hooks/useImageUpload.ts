import { useState } from 'react';

export interface ImageUploadConfig {
  maxSizeInMB: number;
}

export interface ImageUploadResult {
  file: File | null;
  base64: string | null;
  isValidating: boolean;
  validateAndSetFile: (
    file: File | null,
  ) => Promise<{ isValid: boolean; error: string | null }>;
  clear: () => void;
}

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];

export function useImageUpload(config: ImageUploadConfig): ImageUploadResult {
  const [file, setFile] = useState<File | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateAndSetFile = async (fileToValidate: File | null) => {
    console.log('fileToValidate', fileToValidate);
    if (!fileToValidate) {
      setFile(null);
      setBase64(null);
      return { isValid: false, error: null };
    }

    setIsValidating(true);

    // Validate file type
    if (!ALLOWED_TYPES.includes(fileToValidate.type)) {
      setIsValidating(false);
      return {
        isValid: false,
        error: 'Unsupported image type. Allowed: PNG, JPEG, WEBP, SVG',
      };
    }

    // Validate file size
    const maxSizeInBytes = config.maxSizeInMB * 1024 * 1024;
    console.log('fileToValidate.size', fileToValidate.size);
    console.log('maxSizeInBytes', maxSizeInBytes);
    if (fileToValidate.size > maxSizeInBytes) {
      setIsValidating(false);
      return {
        isValid: false,
        error: `Image is too large. Max size is ${config.maxSizeInMB}MB. Please compress it or upload a smaller image.`,
      };
    }

    // Convert to base64
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileToValidate);
      });

      setFile(fileToValidate);
      setBase64(base64String);
      setIsValidating(false);
      return { isValid: true, error: null };
    } catch (err) {
      setIsValidating(false);
      return { isValid: false, error: 'Failed to process image' };
    }
  };

  const clear = () => {
    setFile(null);
    setBase64(null);
  };

  return {
    file,
    base64,
    isValidating,
    validateAndSetFile,
    clear,
  };
}
