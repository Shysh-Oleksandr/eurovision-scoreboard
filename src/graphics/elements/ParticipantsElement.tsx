'use client';
import React, { useMemo, useRef } from 'react';

import { ParticipantsElement as ParticipantsElementModel } from '../model/design';
import { CHIP_METRICS, ChipFit, fitChips } from '../model/participantsFit';
import { rowGeometry } from '../model/rowGeometry';
import { useDesignData } from '../render/DesignDataContext';
import { useFitArea } from '../render/fitArea';

import {
  CountryRow,
  guessNameEm,
  NAME_FONT,
  NAME_PAD_RIGHT,
  NameProbe,
  useNameWidths,
  useRowLook,
} from './CountryRow';

/** Rows on a canvas that sizes to its content (no space to fit into). */
const CONTENT_ROW_HEIGHT = 36;
/** Content-sized: lines this many row heights wide. */
const CONTENT_LINE_RH = 30;

/**
 * Every participating country, A–Z, as board rows as wide as their names
 * in centred lines (the official "participating countries" look). The row
 * height is the largest at which every line fits the element's space; the
 * names are measured in the row font.
 */
const ParticipantsElement: React.FC<{ el: ParticipantsElementModel }> = ({
  el,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  const { participants = [] } = useDesignData();
  const { area, measured } = useFitArea(rootRef, el.h !== undefined);
  const look = useRowLook();
  const geometry = useMemo(
    () => rowGeometry(el.flagStyle, look),
    [el.flagStyle, look],
  );

  const countries = useMemo(() => {
    const seen = new Set<string>();

    return participants
      .filter((c) => (seen.has(c.code) ? false : seen.add(c.code)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [participants]);
  const names = useMemo(
    () => [...new Set(countries.map((c) => c.name))],
    [countries],
  );
  const widths = useNameWidths(
    probeRef,
    `${names.join('|')}:${look.uppercase}`,
  );

  /** Each chip's width in row heights. */
  const chipRh = useMemo(
    () =>
      countries.map(
        (c) =>
          geometry.lead +
          (widths?.get(c.name) ?? guessNameEm(c.name, look.uppercase)) *
            NAME_FONT +
          NAME_PAD_RIGHT +
          // Sub-pixel text and rounding.
          0.08,
      ),
    [countries, geometry.lead, widths, look.uppercase],
  );

  const fit = useMemo<ChipFit>(() => {
    if (area) {
      return fitChips({
        widths: chipRh,
        overhang: geometry.overhang,
        width: area.w,
        height: Math.max(0, area.h - el.paddingY * 2),
      });
    }

    return fitChips({
      widths: chipRh,
      overhang: geometry.overhang,
      width: CONTENT_LINE_RH * CONTENT_ROW_HEIGHT,
      height: Number.MAX_SAFE_INTEGER,
    });
  }, [area, chipRh, geometry.overhang, el.paddingY]);

  const rh = area ? fit.rowHeight : CONTENT_ROW_HEIGHT;
  const gapX = (CHIP_METRICS.gapX + geometry.overhang) * rh;

  return (
    <div
      ref={rootRef}
      data-fit-pending={!measured ? '' : undefined}
      className="relative flex w-full flex-col items-center justify-center"
      style={{
        height: el.h !== undefined ? '100%' : undefined,
        paddingTop: el.paddingY,
        paddingBottom: el.paddingY,
        gap: CHIP_METRICS.gapY * rh,
      }}
    >
      {fit.lines.map((line) => (
        <div
          key={line[0]}
          className="flex justify-center"
          style={{
            gap: gapX,
            // A heart reaching left of the first chip stays in the box.
            paddingLeft: geometry.overhang * rh,
          }}
        >
          {line.map((i) => (
            <CountryRow
              key={countries[i].code}
              country={countries[i]}
              rh={rh}
              geometry={geometry}
              look={look}
              white2026={el.use2026WhiteHeart}
              width={Math.ceil(chipRh[i] * rh)}
            />
          ))}
        </div>
      ))}
      <NameProbe probeRef={probeRef} names={names} uppercase={look.uppercase} />
    </div>
  );
};

export default ParticipantsElement;
