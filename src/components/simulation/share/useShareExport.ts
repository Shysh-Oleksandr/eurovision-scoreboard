'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DesignExportOptions,
  useDesignExport,
} from '@/graphics/export/useDesignExport';
import { Design } from '@/graphics/model/design';

export interface ShareImage {
  dataUrl: string;
  /** Output pixels (design size × export scale). */
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

interface Stamped extends ShareImage {
  design: Design;
  contentKey: unknown;
}

/** The image made on opening: as soon as the stage has painted. */
const OPEN_DELAY_MS = 120;
/** Content-sized designs settle once their measurement holds this long. */
const SETTLE_MS = 150;

const matches = (
  stamp: { design: Design; contentKey: unknown } | null,
  design: Design,
  contentKey: unknown,
) =>
  !!stamp && stamp.design === design && Object.is(stamp.contentKey, contentKey);

/**
 * The share modal's image. It is exported once when the modal opens, so the
 * 95% who save straight away find it ready. Edits only redraw the live stage:
 * nothing is exported until Save, Share or Copy asks for the image
 * (`request()`), which reuses the exported image while it still shows the
 * current design (and the rows behind it, `contentKey`) and exports a new
 * one otherwise. The modal shows the exported image while it is current and
 * the live stage once an edit has made it stale.
 *
 * "Opening" lasts until the user's first edit (`markEdited`): the design can
 * still change by itself before that (the modal resetting its title and
 * layout, a content-sized table being measured), and the opening export
 * follows those changes.
 *
 * Content-sized designs (stats) are measured first: the stage stays hidden
 * until the measurement has held for a moment, so neither the preview nor
 * the export sees the pre-measurement minimum size.
 */
export function useShareExport({
  design,
  contentKey,
  exportOptions,
  active,
  onMeasured,
}: {
  design: Design;
  contentKey: unknown;
  exportOptions: DesignExportOptions;
  /** Only export while the modal is open. */
  active: boolean;
  onMeasured?: (size: Size) => void;
}) {
  const { nodeRef, generate } = useDesignExport(exportOptions);
  const scale = exportOptions.scale ?? 1;

  // The stage's node, as state too: nothing exports before it exists.
  const [hasNode, setHasNode] = useState(false);
  const stageRef = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      setHasNode(!!node);
    },
    [nodeRef],
  );

  // Content-sized canvases: the measured size, and whether it has settled.
  const { autoSize } = design.canvas;
  const [measured, setMeasured] = useState<Size | null>(null);
  const [stable, setStable] = useState(!autoSize);
  const stableTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMeasured = useRef<Size | null>(null);

  useEffect(() => {
    setStable(!autoSize);
  }, [autoSize]);

  const handleMeasured = useCallback(
    (size: Size) => {
      const prev = lastMeasured.current;

      if (prev && prev.width === size.width && prev.height === size.height) {
        return;
      }
      lastMeasured.current = size;
      setMeasured(size);
      setStable(false);
      if (stableTimer.current) clearTimeout(stableTimer.current);
      stableTimer.current = setTimeout(() => setStable(true), SETTLE_MS);
      onMeasured?.(size);
    },
    [onMeasured],
  );

  useEffect(
    () => () => {
      if (stableTimer.current) clearTimeout(stableTimer.current);
    },
    [],
  );

  const canvas: Size =
    autoSize && measured
      ? measured
      : { width: design.canvas.width, height: design.canvas.height };
  const settled = hasNode && stable && (!autoSize || !!measured);

  // The latest inputs, read by exports that start later (timers, requests).
  const latest = useRef({ design, contentKey, canvas });

  latest.current = { design, contentKey, canvas };

  const [image, setImage] = useState<Stamped | null>(null);
  const imageRef = useRef<Stamped | null>(null);
  const [failed, setFailed] = useState<{
    design: Design;
    contentKey: unknown;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef<Promise<ShareImage | null> | null>(null);

  const run = useCallback((): Promise<ShareImage | null> => {
    if (inFlight.current) return inFlight.current;
    const { design: d, contentKey: k, canvas: size } = latest.current;

    if (matches(imageRef.current, d, k)) {
      return Promise.resolve(imageRef.current);
    }
    setBusy(true);
    const job = (async () => {
      let dataUrl: string | null = null;

      try {
        dataUrl = await generate(size);
      } finally {
        inFlight.current = null;
        setBusy(false);
      }
      if (!dataUrl) {
        setFailed({ design: d, contentKey: k });

        return null;
      }
      const stamped: Stamped = {
        dataUrl,
        width: Math.round(size.width * scale),
        height: Math.round(size.height * scale),
        design: d,
        contentKey: k,
      };

      imageRef.current = stamped;
      setImage(stamped);
      setFailed(null);

      return stamped;
    })();

    inFlight.current = job;

    return job;
  }, [generate, scale]);

  const isCurrent = matches(image, design, contentKey);
  const hasFailed = matches(failed, design, contentKey);

  // Every open starts a new "opening": the image is made again.
  const [edited, setEdited] = useState(false);
  const markEdited = useCallback(() => setEdited(true), []);

  useEffect(() => {
    if (active) setEdited(false);
  }, [active]);

  // The opening export; after the first edit, only requests export.
  useEffect(() => {
    if (!active || edited || !settled || isCurrent || hasFailed || busy) {
      return undefined;
    }
    const timer = setTimeout(() => void run(), OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    active,
    edited,
    settled,
    isCurrent,
    hasFailed,
    busy,
    design,
    contentKey,
    run,
  ]);

  /** The current image, exported now if it isn't ready. */
  const request = useCallback(async (): Promise<ShareImage | null> => {
    if (inFlight.current) await inFlight.current;
    const { design: d, contentKey: k } = latest.current;

    if (matches(imageRef.current, d, k)) return imageRef.current;

    return run();
  }, [run]);

  const retry = useCallback(() => {
    setFailed(null);
    void run();
  }, [run]);

  return {
    stageRef,
    handleMeasured,
    canvas,
    /** False while a content-sized stage is still being measured. */
    stable: stable && (!autoSize || !!measured),
    /** The exported image when it shows the current design, else null. */
    image: isCurrent ? image : null,
    /** An export is running (on opening, or for Save / Share / Copy). */
    busy,
    hasFailed,
    retry,
    request,
    /** Ends the opening: call on the user's first edit. */
    markEdited,
  };
}
