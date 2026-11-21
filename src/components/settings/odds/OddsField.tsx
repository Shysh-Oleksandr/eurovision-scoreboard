'use client';
import { useLocale } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import { DEFAULT_ODDS, formatOdds, MAX_ODDS, parseOdds } from './oddsFormat';

/** A pause this long in typing saves the value. */
const COMMIT_DELAY = 400;

interface OddsFieldProps {
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  ariaLabel: string;
  /** Enter, ↓ and ↑ move to the same field in the next / previous row. */
  onMove: (delta: 1 | -1) => void;
  row: number;
  column: 'jury' | 'televote';
}

/**
 * One odds value in the table: text with the decimal keypad, so the
 * language's decimal mark reads the same everywhere ("41,5" in German) and
 * ↑ / ↓ move between rows instead of nudging the number. Saves after a
 * pause, on Enter and when it loses focus; an empty field counts as 50 (the
 * placeholder). Over 1000 is outlined while typed and becomes 1000 on
 * leaving the field; anything that isn't a number goes back to the saved
 * value.
 */
const OddsField: React.FC<OddsFieldProps> = ({
  value,
  onCommit,
  ariaLabel,
  onMove,
  row,
  column,
}) => {
  const locale = useLocale();
  const [text, setText] = useState(() => formatOdds(value, locale));
  const [invalid, setInvalid] = useState(false);
  const committedRef = useRef(value);
  const pendingRef = useRef<{ value: number | undefined } | null>(null);
  const timerRef = useRef<number | null>(null);
  const onCommitRef = useRef(onCommit);

  onCommitRef.current = onCommit;

  const cancelPending = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
  };

  const flush = () => {
    const pending = pendingRef.current;

    cancelPending();
    if (pending && pending.value !== committedRef.current) {
      committedRef.current = pending.value;
      onCommitRef.current(pending.value);
    }
  };

  // A change from elsewhere (Set all odds, Undo) replaces the text and drops
  // a half-typed edit; our own saves coming back are ignored.
  useEffect(() => {
    if (value === committedRef.current) return;
    committedRef.current = value;
    cancelPending();
    setText(formatOdds(value, locale));
    setInvalid(false);
  }, [value, locale]);

  // Leaving the tab (or closing the modal) mid-pause still saves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flush(), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    const parsed = parseOdds(next);

    setText(next);

    if (!parsed.ok) {
      cancelPending();
      setInvalid(true);

      return;
    }

    setInvalid(false);
    pendingRef.current = { value: parsed.value };
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, COMMIT_DELAY);
  };

  const handleBlur = () => {
    const parsed = parseOdds(text);

    if (!parsed.ok && parsed.tooHigh) {
      pendingRef.current = { value: MAX_ODDS };
    }
    flush();
    setInvalid(false);
    setText(formatOdds(committedRef.current, locale));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      onMove(e.key === 'ArrowUp' ? -1 : 1);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      enterKeyHint="next"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      data-odds-row={row}
      data-odds-col={column}
      value={text}
      placeholder={formatOdds(DEFAULT_ODDS, locale)}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onFocus={(e) => e.currentTarget.select()}
      className={`dp-odds-field ${
        invalid ? 'is-invalid' : ''
      } w-full min-w-0 rounded-[9px] px-[11px] text-right font-bold tabular-nums text-white placeholder:text-white/35`}
    />
  );
};

export default OddsField;
