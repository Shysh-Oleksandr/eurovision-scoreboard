'use client';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ColorPicker from 'react-best-gradient-color-picker';
import { createPortal } from 'react-dom';

import { CopyIcon } from '@/assets/icons/CopyIcon';
import { UndoIcon } from '@/assets/icons/UndoIcon';
import Button from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Input } from '@/components/Input';
import { hslStringToHex, parseColor } from '@/helpers/colorConversion';

const sanitizeGradient = (input: string): string => {
  if (!/linear-gradient\s*\(/i.test(input)) return input;
  let out = input;

  // Fix missing angle: "linear-gradient(deg, ..." -> "linear-gradient(180deg, ..."
  out = out.replace(/linear-gradient\s*\(\s*deg\s*,/i, 'linear-gradient(0deg,');
  // Fix NaNdeg
  out = out.replace(
    /linear-gradient\s*\(\s*NaNdeg\s*,/i,
    'linear-gradient(0deg,',
  );
  // Guard against NaN% stops
  out = out.replace(/NaN%/gi, '0%');

  return out;
};

export interface ColorFieldDefinition {
  key: string;
  label: string;
  groupKey: string;
  enableGradient?: boolean;
  enableOpacity?: boolean;
}

interface ColorOverridePickerProps {
  label: string;
  value: string | undefined;
  defaultValue: string;
  onChange: (value: string | undefined) => void;
  enableGradient?: boolean;
  enableOpacity?: boolean;
  allColorFields?: ColorFieldDefinition[];
  currentFieldKey?: string;
  onBulkChange?: (updates: Record<string, string>) => void;
}

const ColorOverridePicker: React.FC<ColorOverridePickerProps> = ({
  label,
  value,
  defaultValue,
  onChange,
  enableGradient = false,
  enableOpacity = false,
  allColorFields = [],
  currentFieldKey,
  onBulkChange,
}) => {
  const t = useTranslations('widgets.themes');

  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [showCopyPopup, setShowCopyPopup] = useState(false);
  const [copyPopupPosition, setCopyPopupPosition] = useState({
    top: 0,
    left: 0,
  });
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const buttonRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLDivElement>(null);

  const currentValue = value || defaultValue || '#000000';

  const isGradient = /gradient\(/i.test(currentValue);
  let displayColor: string;

  if (isGradient) {
    displayColor = sanitizeGradient(currentValue);
  } else if (currentValue.startsWith('#')) {
    displayColor = currentValue;
  } else if (
    /^hsl\(/i.test(currentValue) ||
    /^(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%$/.test(currentValue) ||
    /^(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%\s+(\d+(?:\.\d+)?)$/.test(
      currentValue,
    )
  ) {
    displayColor = hslStringToHex(currentValue);
  } else {
    // rgb/rgba or other formats supported by the picker
    displayColor = currentValue;
  }

  // Normalize display format to always show as hsl(...) or hsla(...)
  const getDisplayValue = (colorValue: string) => {
    if (/gradient\(/i.test(colorValue)) {
      return colorValue;
    }
    if (colorValue.startsWith('hsl(') || colorValue.startsWith('hsla(')) {
      return colorValue;
    }
    if (
      colorValue.startsWith('#') ||
      colorValue.startsWith('rgba(') ||
      colorValue.startsWith('rgb(')
    ) {
      // Convert to hsl format for display
      const hsl = parseColor(colorValue);
      const parts = hsl.split(/\s+/);

      if (parts.length === 4) {
        // Has alpha: "h s% l% a"
        const [h, s, l, a] = parts;

        return `hsla(${h}, ${s}, ${l}, ${a})`;
      }

      // No alpha: "h s% l%"
      return `hsl(${hsl})`;
    }

    // Handle our custom "h s% l%" or "h s% l% a" format
    const parts = colorValue.split(/\s+/);

    if (parts.length === 4) {
      // Has alpha: "h s% l% a"
      const [h, s, l, a] = parts;

      return `hsla(${h}, ${s}, ${l}, ${a})`;
    }

    // No alpha: "h s% l%"
    return `hsl(${colorValue})`;
  };

  // Filter available fields for copying
  const availableFields = useMemo(() => {
    return allColorFields.filter((field) => {
      const fullKey = `${field.groupKey}.${field.key}`;

      // Exclude current field
      if (fullKey === currentFieldKey) return false;

      // If current value is a gradient, only show fields that support gradients
      if (isGradient && !field.enableGradient) return false;

      return true;
    });
  }, [allColorFields, currentFieldKey, isGradient]);

  // Filter fields by search text
  const filteredFields = useMemo(() => {
    if (!searchText.trim()) return availableFields;

    const searchLower = searchText.toLowerCase();

    return availableFields.filter((field) =>
      field.label.toLowerCase().includes(searchLower),
    );
  }, [availableFields, searchText]);

  // Calculate picker position synchronously
  const calculatePickerPosition = useCallback(() => {
    if (!buttonRef.current) return { top: 0, left: 0 };

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const pickerHeight = 400; // Approximate Chrome picker height
    const pickerWidth = 295; // Approximate Chrome picker width

    let top = rect.bottom + 8;
    let { left } = rect;

    // Adjust if picker would go off bottom of screen
    if (top + pickerHeight > viewportHeight) {
      top = rect.top - pickerHeight - 8;
    }

    // Adjust if picker would go off right side of screen
    if (left + pickerWidth > viewportWidth) {
      left = viewportWidth - pickerWidth - 16;
    }

    // Ensure picker doesn't go off left side
    if (left < 16) {
      left = 16;
    }

    return { top, left };
  }, []);

  // Calculate copy popup position synchronously
  const calculateCopyPopupPosition = useCallback(() => {
    if (!copyButtonRef.current)
      return {
        top: 0,
        left: 0,
      };

    const rect = copyButtonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const popupHeight = 400; // Approximate popup height
    const popupWidth = 320; // Approximate popup width

    let top = rect.bottom + 8;
    let { left } = rect;

    // Adjust if popup would go off bottom of screen
    if (top + popupHeight > viewportHeight) {
      top = rect.top - popupHeight - 8;
    }

    // Adjust if popup would go off right side of screen
    if (left + popupWidth > viewportWidth) {
      left = viewportWidth - popupWidth - 16;
    }

    // Ensure popup doesn't go off left side
    if (left < 16) {
      left = 16;
    }

    return { top, left };
  }, []);

  // Recalculate position on window resize/scroll when picker is open
  useEffect(() => {
    if (!showPicker) return;

    const updatePosition = () => {
      const position = calculatePickerPosition();

      setPickerPosition(position);
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showPicker, calculatePickerPosition]);

  // Recalculate copy popup position on window resize/scroll when open
  useEffect(() => {
    if (!showCopyPopup) return;

    const updatePosition = () => {
      const position = calculateCopyPopupPosition();

      setCopyPopupPosition(position);
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showCopyPopup, calculateCopyPopupPosition]);

  // Handle escape key to close picker or copy popup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showPicker) {
          setShowPicker(false);
        }
        if (showCopyPopup) {
          setShowCopyPopup(false);
          setSelectedFields(new Set());
          setSearchText('');
        }
      }
    };

    if (showPicker || showCopyPopup) {
      document.addEventListener('keydown', handleKeyDown);

      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showPicker, showCopyPopup]);

  const handleColorChange = (color: string) => {
    // react-best-gradient-color-picker provides a string for both solid and gradient
    const normalized = parseColor(color);
    const sanitized = /gradient\(/i.test(normalized)
      ? sanitizeGradient(normalized)
      : normalized;

    onChange(sanitized);
  };

  const handleCopyButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!showCopyPopup && copyButtonRef.current) {
      // Calculate position before opening to prevent flash
      const position = calculateCopyPopupPosition();

      setCopyPopupPosition(position);
    }
    setShowCopyPopup(!showCopyPopup);

    // Reset selection when closing
    if (showCopyPopup) {
      setSelectedFields(new Set());
      setSearchText('');
    }
  };

  const handleFieldToggle = (fullKey: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);

      if (next.has(fullKey)) {
        next.delete(fullKey);
      } else {
        next.add(fullKey);
      }

      return next;
    });
  };

  const handleCopy = () => {
    if (selectedFields.size === 0 || !onBulkChange) return;

    const updates: Record<string, string> = {};

    selectedFields.forEach((fullKey) => {
      updates[fullKey] = currentValue;
    });

    onBulkChange(updates);
    setShowCopyPopup(false);
    setSelectedFields(new Set());
    setSearchText('');
  };

  const isCustom = value !== undefined && value !== defaultValue;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-white text-xs">{label}</label>
      </div>

      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-md p-1 transition-colors"
        onClick={() => {
          if (!showPicker) {
            // Calculate position before opening to prevent flash
            const position = calculatePickerPosition();

            setPickerPosition(position);
          }
          setShowPicker(!showPicker);
        }}
      >
        <div
          ref={buttonRef}
          className="w-8 h-6 rounded border-2 border-white/30 cursor-pointer hover:border-white/50 transition-colors"
          style={{ background: displayColor }}
        />
        <span className="text-white/70 text-xs font-mono flex-1 truncate">
          {getDisplayValue(currentValue)}
        </span>

        {isCustom && (
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="!px-2.5 !py-1.5"
            Icon={<UndoIcon className="w-4 h-4" />}
          ></Button>
        )}
        <div ref={copyButtonRef}>
          <Button
            variant="tertiary"
            onClick={handleCopyButtonClick}
            className="!px-2.5 !py-1.5"
            Icon={<CopyIcon className="w-4 h-4" />}
          ></Button>
        </div>
      </div>

      {showPicker &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setShowPicker(false)}
            />
            <div
              className="fixed z-[9999]"
              style={{
                top: `${pickerPosition.top}px`,
                left: `${pickerPosition.left}px`,
              }}
            >
              <ColorPicker
                value={displayColor}
                onChange={handleColorChange}
                height={200}
                hideColorTypeBtns={!enableGradient}
                hideOpacity={!enableOpacity}
              />
            </div>
          </>,
          document.body,
        )}

      {showCopyPopup &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => {
                setShowCopyPopup(false);
                setSelectedFields(new Set());
                setSearchText('');
              }}
            />
            <div
              className="fixed z-[9999] bg-primary-900 rounded-lg shadow-xl border border-white/20 p-4 flex flex-col"
              style={{
                top: `${copyPopupPosition.top}px`,
                left: `${copyPopupPosition.left}px`,
                width: '320px',
                maxHeight: '400px',
              }}
              data-theme="custom-preview"
            >
              <h3 className="text-white text-sm font-semibold mb-3">
                {t('copyToFields')}
              </h3>

              <Input
                placeholder={t('searchFields')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="mb-3 !py-2 !h-auto"
              />

              <div className="flex-1 overflow-y-auto mb-3 space-y-2">
                {filteredFields.length === 0 ? (
                  <div className="text-white/50 text-sm text-center py-4">
                    {t('noFieldsFound')}
                  </div>
                ) : (
                  filteredFields.map((field) => {
                    const fullKey = `${field.groupKey}.${field.key}`;

                    return (
                      <div key={fullKey}>
                        <Checkbox
                          id={`copy-${fullKey}`}
                          label={field.label}
                          checked={selectedFields.has(fullKey)}
                          onChange={() => handleFieldToggle(fullKey)}
                          labelClassName="text-white text-sm"
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <Button
                variant="primary"
                onClick={handleCopy}
                disabled={selectedFields.size === 0}
                className="w-full"
              >
                {t('copyToNFields', { count: selectedFields.size })}
              </Button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default ColorOverridePicker;
