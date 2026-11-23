'use client';
import React, { useMemo, useRef } from 'react';

import {
  DrawElement as DrawElementModel,
  DrawEntry,
  DrawSemi,
} from '../model/design';
import {
  DRAW_METRICS as M,
  drawColumns,
  DrawFit,
  fitDraw,
  fitSemiOf,
  MAX_COLUMN_RH,
} from '../model/drawFit';
import { RowGeometry, rowGeometry } from '../model/rowGeometry';
import { useFitArea } from '../render/fitArea';

import {
  CountryRow,
  guessNameEm,
  Heart,
  NameProbe,
  PLACE_CLASSES,
  RowLook,
  rowRadius,
  TEXT_SHADOW,
  useNameWidths,
  useRowLook,
} from './CountryRow';

/** Rows on a canvas that sizes to its content (no space to fit into). */
const CONTENT_ROW_HEIGHT = 36;

/** One country, with its running-order number when the draw gave one. */
const DrawRow: React.FC<{
  entry: DrawEntry;
  position: number;
  numbered: boolean;
  rh: number;
  el: DrawElementModel;
  geometry: RowGeometry;
  look: RowLook;
}> = ({ entry, position, numbered, rh, el, geometry, look }) => (
  <div className="flex" style={{ height: rh, gap: rh * M.numberGap }}>
    {numbered && (
      <div
        className={`dp-scoreboard-font flex flex-none items-center justify-center font-semibold tabular-nums ${PLACE_CLASSES}`}
        style={{
          width: rh * M.numberWidth,
          borderRadius: rowRadius(look, rh),
          fontSize: rh * M.nameFont,
          ...look.placeStyle,
        }}
      >
        {String(position).padStart(2, '0')}
      </div>
    )}
    <CountryRow
      country={entry}
      rh={rh}
      geometry={geometry}
      look={look}
      white2026={el.use2026WhiteHeart}
    />
  </div>
);

const SemiBlock: React.FC<{
  semi: DrawSemi;
  el: DrawElementModel;
  fit: DrawFit;
  geometry: RowGeometry;
  look: RowLook;
}> = ({ semi, el, fit, geometry, look }) => {
  const rh = fit.rowHeight;
  const columns = drawColumns(semi, el.order);
  const numbered = el.order === 'positions';
  const overhang = geometry.overhang * rh;
  const voters = el.showVoters ? semi.voters : [];

  return (
    <section className="flex flex-col items-center min-w-0">
      <h3
        className="m-0 text-center font-bold text-white"
        style={{
          fontSize: rh * M.titleFont,
          lineHeight: M.titleLine,
          marginBottom: rh * M.titleGap,
          textShadow: TEXT_SHADOW,
          whiteSpace: 'nowrap',
        }}
      >
        {semi.name}
      </h3>
      <div
        className="flex"
        style={{ gap: rh * M.columnGap, paddingLeft: overhang }}
      >
        {columns.map((column, i) => (
          <div
            key={column.header ?? i}
            className="flex flex-col"
            style={{ width: fit.columnWidth }}
          >
            {column.header && (
              <div
                className="font-bold uppercase text-white/80 truncate"
                style={{
                  fontSize: rh * M.headFont,
                  lineHeight: M.headLine,
                  marginBottom: rh * M.headGap,
                  marginLeft: -overhang,
                  letterSpacing: '0.06em',
                  textShadow: TEXT_SHADOW,
                }}
              >
                {el.labels[column.header]}
              </div>
            )}
            <div className="flex flex-col" style={{ gap: rh * M.rowGap }}>
              {column.cells.map((cell) => (
                <DrawRow
                  key={cell.entry.code}
                  entry={cell.entry}
                  position={cell.position}
                  numbered={numbered}
                  rh={rh}
                  el={el}
                  geometry={geometry}
                  look={look}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {voters.length > 0 && (
        <div
          className="flex flex-wrap items-center justify-center text-white"
          style={{
            marginTop: rh * M.votersGap,
            columnGap: rh * M.voterChipGap,
            rowGap: rh * M.voterLineGap,
            maxWidth: '100%',
          }}
        >
          <span
            className="font-bold uppercase text-white/80"
            style={{
              fontSize: rh * M.labelFont,
              lineHeight: `${rh * M.voterLine}px`,
              letterSpacing: '0.06em',
              textShadow: TEXT_SHADOW,
            }}
          >
            {el.labels.voters}
          </span>
          {voters.map((voter) => (
            <span
              key={voter.code}
              className="flex items-center font-semibold whitespace-nowrap"
              style={{
                gap: rh * 0.18,
                fontSize: rh * M.voterFont,
                height: rh * M.voterLine,
                textShadow: TEXT_SHADOW,
              }}
            >
              <span
                className="relative flex-none"
                style={{ width: rh * M.voterHeart, height: rh * M.voterHeart }}
              >
                <Heart
                  country={voter}
                  size={rh * M.voterHeart}
                  white={el.use2026WhiteHeart}
                />
              </span>
              {voter.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

/**
 * The allocation draw's result: every semi-final with its title, its halves
 * (or numbered running order, or plain list) of board rows and, when on,
 * the pre-qualified countries voting in it. One row height drives every
 * size; it is the largest that fits the element's space (its box, or what
 * a fixed-height stack leaves), semis side by side or stacked.
 */
const DrawElement: React.FC<{ el: DrawElementModel }> = ({ el }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  const { area, measured } = useFitArea(rootRef, el.h !== undefined);
  const look = useRowLook();
  const geometry = useMemo(
    () => rowGeometry(el.flagStyle, look),
    [el.flagStyle, look],
  );

  const names = useMemo(
    () => [
      ...new Set(el.semis.flatMap((semi) => semi.entries.map((e) => e.name))),
    ],
    [el.semis],
  );
  const widths = useNameWidths(
    probeRef,
    `${names.join('|')}:${look.uppercase}`,
  );
  const nameEm = Math.max(
    0,
    ...names.map((n) => widths?.get(n) ?? guessNameEm(n, look.uppercase)),
  );

  const fit = useMemo<DrawFit>(() => {
    const semis = el.semis.map((semi) =>
      fitSemiOf(semi, el.order, el.showVoters),
    );
    const input = {
      semis,
      numbered: el.order === 'positions',
      lead: geometry.lead,
      overhang: geometry.overhang,
      nameEm,
      votersLabelChars: el.labels.voters.length,
    };

    if (area) {
      return fitDraw({
        ...input,
        width: area.w,
        height: Math.max(0, area.h - el.paddingY * 2),
      });
    }
    const rh = CONTENT_ROW_HEIGHT;

    return {
      arrangement: 'row',
      rowHeight: rh,
      columnWidth: MAX_COLUMN_RH * rh,
    };
  }, [el, area, geometry, nameEm]);

  const rh = fit.rowHeight;

  return (
    <div
      ref={rootRef}
      data-fit-pending={!measured ? '' : undefined}
      className="relative flex w-full items-center justify-center"
      style={{
        height: el.h !== undefined ? '100%' : undefined,
        paddingTop: el.paddingY,
        paddingBottom: el.paddingY,
      }}
    >
      <div
        className="flex justify-center"
        style={{
          flexDirection: fit.arrangement,
          alignItems: fit.arrangement === 'row' ? 'flex-start' : 'center',
          gap:
            rh * (fit.arrangement === 'row' ? M.semiGapRow : M.semiGapColumn),
        }}
      >
        {el.semis.map((semi) => (
          <SemiBlock
            key={semi.id}
            semi={semi}
            el={el}
            fit={fit}
            geometry={geometry}
            look={look}
          />
        ))}
      </div>
      <NameProbe probeRef={probeRef} names={names} uppercase={look.uppercase} />
    </div>
  );
};

export default DrawElement;
