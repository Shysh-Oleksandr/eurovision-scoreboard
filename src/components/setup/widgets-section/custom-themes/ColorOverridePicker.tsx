import React, { useEffect, useRef, useState } from 'react';
import ColorPicker from 'react-best-gradient-color-picker';
import { createPortal } from 'react-dom';

import { UndoIcon } from '@/assets/icons/UndoIcon';
import Button from '@/components/common/Button';
import { hslStringToHex, parseColor } from '@/helpers/colorConversion';

interface ColorOverridePickerProps {
  label: string;
  value: string | undefined;
  defaultValue: string;
  onChange: (value: string | undefined) => void;
  enableGradient?: boolean;
}

const ColorOverridePicker: React.FC<ColorOverridePickerProps> = ({
  label,
  value,
  defaultValue,
  onChange,
  enableGradient = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  const currentValue = value || defaultValue;
  const isGradient = /gradient\(/i.test(currentValue);
  let displayColor: string;

  if (isGradient) {
    displayColor = currentValue;
  } else if (currentValue.startsWith('#')) {
    displayColor = currentValue;
  } else if (
    /^hsl\(/i.test(currentValue) ||
    /^(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%$/.test(currentValue)
  ) {
    displayColor = hslStringToHex(currentValue);
  } else {
    // rgb/rgba or other formats supported by the picker
    displayColor = currentValue;
  }

  // Normalize display format to always show as hsl(...)
  const getDisplayValue = (colorValue: string) => {
    if (/gradient\(/i.test(colorValue)) {
      return colorValue;
    }
    if (colorValue.startsWith('hsl(')) {
      return colorValue;
    }
    if (colorValue.startsWith('#')) {
      // Convert hex to hsl format for display
      const hsl = parseColor(colorValue);

      return `hsl(${hsl})`;
    }

    // Convert "h s% l%" to "hsl(h, s%, l%)"
    return `hsl(${colorValue})`;
  };

  // Calculate picker position when opening
  useEffect(() => {
    if (showPicker && buttonRef.current) {
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

      setPickerPosition({ top, left });
    }
  }, [showPicker]);

  // Handle escape key to close picker
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPicker) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('keydown', handleKeyDown);

      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showPicker]);

  const handleColorChange = (color: string) => {
    // react-best-gradient-color-picker provides a string for both solid and gradient
    const normalized = parseColor(color);

    onChange(normalized);
  };

  const isCustom = value !== undefined && value !== defaultValue;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-white text-xs">{label}</label>
      </div>

      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-md p-1 transition-colors"
        onClick={() => setShowPicker(!showPicker)}
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
                hideOpacity
                height={200}
                hideColorTypeBtns={!enableGradient}
              />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default ColorOverridePicker;
