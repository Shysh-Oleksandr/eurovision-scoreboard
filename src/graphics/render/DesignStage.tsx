'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { AbsoluteChild, ElementView } from '../elements/registry';
import { Design, isStack } from '../model/design';
import {
  designThemeCssVars,
  designThemeToScope,
  resolveDesignThemeFonts,
} from '../model/designTheme';

import { FillLayers } from './fills';

import { ensureFontsReady } from '@/theme/customFonts';
import { ThemeScopeProvider } from '@/theme/ThemeScope';

export interface DesignStageProps {
  design: Design;
  /** Preview scale; the inner node keeps design px so exports can neutralise it. */
  zoom: number;
  /** The design-size node, i.e. what `exportNode` snapshots. */
  nodeRef?: React.Ref<HTMLDivElement>;
  /** Auto-sized canvases report their measured content size here. */
  onMeasured?: (size: { width: number; height: number }) => void;
  /** Screen-space layer over the scaled stage (selection, guides). */
  overlay?: React.ReactNode;
  onElementPointerDown?: (
    e: React.PointerEvent<HTMLDivElement>,
    elementId: string,
  ) => void;
  onBackgroundPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Hover tracking for the editor (fires for the whole design node). */
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  className?: string;
}

/**
 * Renders a design at design size inside a wrapper scaled by `zoom`. The
 * wrapper takes the scaled size so page layout is correct; the inner node is
 * `canvas.width × canvas.height` CSS px with `transform: scale(zoom)`.
 *
 * `canvas.autoSize` canvases (the stats image) let the content decide: the
 * node is sized by its first fill-canvas stack, measured with a
 * ResizeObserver, and the measurement is reported through `onMeasured` so
 * the owner can store it back into `canvas.width/height`.
 *
 * `design.theme` scopes the node to that theme: the palette, interface
 * tokens and font variables go inline on the node and the row components
 * read the theme through `ThemeScope`, so the design ignores the app's
 * active theme. Without it the design follows the active theme as before.
 */
export const DesignStage: React.FC<DesignStageProps> = ({
  design,
  zoom,
  nodeRef,
  onMeasured,
  overlay,
  onElementPointerDown,
  onBackgroundPointerDown,
  onPointerMove,
  className,
}) => {
  const { width, height, autoSize, background } = design.canvas;
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Content-sized canvases: the wrapper must follow the measured content, not
  // the design's minimum size, or the preview gets clipped.
  const [measured, setMeasured] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (typeof nodeRef === 'function') nodeRef(node);
    else if (nodeRef)
      (nodeRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  useEffect(() => {
    if (!autoSize || !innerRef.current) return undefined;
    const node = innerRef.current;
    const report = () => {
      const w = Math.ceil(node.scrollWidth);
      const h = Math.ceil(node.scrollHeight);

      if (w <= 0 || h <= 0) return;
      setMeasured((prev) =>
        prev && prev.width === w && prev.height === h
          ? prev
          : { width: w, height: h },
      );
      onMeasured?.({ width: w, height: h });
    };
    const observer = new ResizeObserver(report);

    observer.observe(node);
    report();

    return () => observer.disconnect();
  }, [autoSize, onMeasured, design]);

  const fillStack = design.elements.find((el) => isStack(el) && el.fillCanvas);
  const absolute = design.elements.filter((el) => el !== fillStack);
  const outerWidth = autoSize && measured ? measured.width : width;
  const outerHeight = autoSize && measured ? measured.height : height;

  const { theme } = design;
  const themeVars = useMemo(
    () => (theme ? designThemeCssVars(theme) : null),
    [theme],
  );
  const scope = useMemo(
    () => (theme ? designThemeToScope(theme) : null),
    [theme],
  );

  useEffect(() => {
    if (theme) ensureFontsReady(resolveDesignThemeFonts(theme));
  }, [theme]);

  const node = (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ width: outerWidth * zoom, height: outerHeight * zoom }}
    >
      <div
        ref={setRefs}
        data-design-node
        data-auto-size={autoSize ? '' : undefined}
        className="absolute left-0 top-0 overflow-hidden"
        style={{
          width: autoSize ? 'max-content' : width,
          height: autoSize ? 'max-content' : height,
          minWidth: autoSize ? width : undefined,
          minHeight: autoSize ? height : undefined,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          ...(themeVars
            ? {
                ...(themeVars as React.CSSProperties),
                // Re-resolve the font here so the node's own variables win
                // over the family the editor chrome inherited from <html>.
                fontFamily: 'var(--dp-font-family)',
                fontSynthesis: 'var(--dp-font-synthesis)',
              }
            : {}),
        }}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
      >
        <FillLayers fills={background} />
        {fillStack && !fillStack.hidden && (
          <div
            data-element-id={fillStack.id}
            className={autoSize ? 'relative' : 'absolute inset-0'}
            style={
              autoSize ? { minWidth: width, minHeight: height } : undefined
            }
          >
            <ElementView el={fillStack} />
          </div>
        )}
        {absolute.map((el) => (
          <AbsoluteChild
            key={el.id}
            el={el}
            onPointerDown={
              onElementPointerDown
                ? (e) => {
                    e.stopPropagation();
                    onElementPointerDown(e, el.id);
                  }
                : undefined
            }
          />
        ))}
      </div>
      {overlay}
    </div>
  );

  return scope ? (
    <ThemeScopeProvider value={scope}>{node}</ThemeScopeProvider>
  ) : (
    node
  );
};

export default DesignStage;
