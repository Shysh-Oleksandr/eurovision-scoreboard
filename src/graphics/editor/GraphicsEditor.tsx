'use client';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

import { DesignDataProvider, useDesignData } from '../render/DesignDataContext';
import { OpenEditorRequest } from '../state/graphicsStudioStore';
import { sweepUnreferencedAssets } from '../storage/designsDb';

import {
  ContestAccessDialog,
  ExportDialog,
  SignInDialog,
  TooLargeDialog,
  UnsavedDialog,
} from './chrome/EditorDialogs';
import { EditorPanel, EditorRail } from './chrome/EditorRail';
import EditorTopBar from './chrome/EditorTopBar';
import ExportPopover from './chrome/ExportPopover';
import PublishDialog from './chrome/PublishDialog';
import EditorStage from './EditorStage';
import { useEditorStore } from './editorStore';
import Inspector from './inspector/Inspector';
import { PhoneBar, PhoneSheet, PhoneTopBar } from './phone/PhoneChrome';
import { useAutosave } from './useAutosave';
import { useEditorExport } from './useEditorExport';
import { useEditorKeyboard } from './useEditorKeyboard';
import { BoxMap } from './useElementBoxes';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuthStore } from '@/state/useAuthStore';

import './editor.css';

interface Props {
  request: OpenEditorRequest;
  onClose: () => void;
}

/**
 * The free-form editor (handoff direction A). Desktop ≥ 1024 px: top bar,
 * rail + panel, stage, inspector. Narrower: phone layout with a bottom bar
 * and a sheet. Rendered in a portal above every modal; the design node is
 * the same `DesignStage` the share modals export.
 */
const GraphicsEditor: React.FC<Props> = ({ request, onClose }) => {
  const t = useTranslations('graphics.editor');
  const compact = !useMediaQuery('(min-width: 1024px)');
  const designNodeRef = useRef<HTMLDivElement | null>(null);
  const exportAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [boxes, setBoxes] = useState<BoxMap>(() => new Map());
  const [tooLarge, setTooLarge] = useState<{
    fileName: string;
    size: number;
  } | null>(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [signIn, setSignIn] = useState<'publish' | 'cloud' | null>(null);
  const user = useAuthStore((s) => s.user);

  const load = useEditorStore((s) => s.load);
  const data = useEditorStore((s) => s.design.data);
  const setPanel = useEditorStore((s) => s.setPanel);
  const setSheet = useEditorStore((s) => s.setSheet);
  const setExport = useEditorStore((s) => s.setExport);
  const modalDepth = useEditorStore((s) => s.modalDepth);

  // Leaving the editor: forget the document (and its history) and drop
  // uploads no draft references any more.
  useEffect(
    () => () => {
      useEditorStore.getState().reset();
      void sweepUnreferencedAssets();
    },
    [],
  );

  useEffect(() => {
    load(
      request.design,
      request.draftId ?? null,
      request.selectId ?? null,
      request.cloudId ?? null,
    );
    if (request.selectId && compact) setSheet('inspector');
    if (request.publish) setPublishOpen(true);
    // The request identity is the open event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Publishing needs an account (handoff §9): signed out → sign-in dialog.
  const requestPublish = useCallback(() => {
    if (!user) {
      setSignIn('publish');

      return;
    }
    setExport({ open: false });
    setPublishOpen(true);
  }, [user, setExport]);

  const { save, saving } = useAutosave();

  // Closing the tab with unsaved changes asks the browser's own confirm.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!useEditorStore.getState().dirty) return;
      e.preventDefault();
      // Legacy browsers need a value to show the prompt.
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
  const {
    status: exportStatus,
    run: runExport,
    retryOtherEngine,
    close: closeExport,
    download,
    share,
    copy,
  } = useEditorExport(designNodeRef);
  const pendingRef = useRef<'download' | 'share' | 'copy' | null>(null);

  useEffect(() => {
    if (exportStatus.kind !== 'done' || !pendingRef.current) return;
    const action = pendingRef.current;
    const { result } = exportStatus;

    pendingRef.current = null;
    if (action === 'download') download(result);
    if (action === 'share') share(result);
    if (action === 'copy') copy(result);
  }, [exportStatus, download, share, copy]);

  const handleExport = useCallback(
    (then: 'download' | 'share' | 'copy') => {
      pendingRef.current = then;
      setExport({ open: false });
      useEditorStore.getState().clearSelection();
      runExport();
    },
    [runExport, setExport],
  );

  const handleSave = useCallback(async () => {
    const id = await save();

    if (id) toast.success(t('toast.saved'));
  }, [save, t]);

  // Every edited design autosaves, so closing just flushes the last edit.
  // Only a failed save asks what to do with the changes.
  const requestClose = useCallback(() => {
    const { dirty } = useEditorStore.getState();

    if (!dirty) {
      onClose();

      return;
    }
    save().then((id) => {
      if (id) onClose();
      else setUnsavedOpen(true);
    });
  }, [save, onClose]);

  const dialogOpen =
    exportStatus.kind !== 'idle' ||
    !!tooLarge ||
    unsavedOpen ||
    publishOpen ||
    !!signIn ||
    modalDepth > 0;

  // Escape never closes the editor itself (one press too many used to): it
  // only unwinds popover → panel → sheet → selection (useEditorKeyboard).
  useEditorKeyboard(!dialogOpen);

  const onBoxes = useCallback((next: BoxMap) => setBoxes(next), []);

  const content = (
    <div
      className={`gfx-editor${compact ? ' is-phone' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('aria')}
    >
      <DesignDataProvider binding={data}>
        {compact ? (
          <>
            <PhoneTopBar
              onClose={requestClose}
              onExport={() => handleExport('download')}
            />
            <EditorStage
              designNodeRef={designNodeRef}
              compact
              onBoxes={onBoxes}
            />
            <PhoneSheetGate
              boxes={boxes}
              onTooLarge={setTooLarge}
              onPublish={requestPublish}
            />
          </>
        ) : (
          <>
            <EditorTopBar
              onClose={requestClose}
              onSave={handleSave}
              onPublish={requestPublish}
              saving={saving}
              exportAnchorRef={exportAnchorRef}
            />
            <div className="gfx-main">
              <EditorRail />
              <EditorPanel />
              <div className="gfx-stage-wrap">
                <EditorStage
                  designNodeRef={designNodeRef}
                  compact={false}
                  onBoxes={onBoxes}
                />
                <ExportPopover
                  anchorRef={exportAnchorRef}
                  onExport={handleExport}
                />
              </div>
              <Inspector
                boxes={boxes}
                onTooLarge={setTooLarge}
                openDataPanel={() => setPanel('data')}
              />
            </div>
          </>
        )}
        <ContestAccessGate />
        <PublishDialog
          open={publishOpen}
          designNodeRef={designNodeRef}
          onClose={() => setPublishOpen(false)}
          onPublished={() => {
            // The cloud id is part of the draft record: persist it now.
            save();
          }}
        />
      </DesignDataProvider>

      <SignInDialog reason={signIn} onClose={() => setSignIn(null)} />
      <ExportDialog
        status={exportStatus}
        onClose={closeExport}
        onRetry={() => runExport()}
        onOtherEngine={retryOtherEngine}
        onDownload={download}
        onShare={share}
        onCopy={copy}
      />
      <TooLargeDialog
        info={tooLarge}
        onClose={() => setTooLarge(null)}
        onChooseAnother={() => {
          setTooLarge(null);
          setTimeout(
            () =>
              document
                .querySelector<HTMLInputElement>(
                  '.gfx-editor input[type="file"]',
                )
                ?.click(),
            50,
          );
        }}
      />
      <UnsavedDialog
        open={unsavedOpen}
        onCancel={() => setUnsavedOpen(false)}
        onDiscard={() => {
          setUnsavedOpen(false);
          onClose();
        }}
        onSave={async () => {
          setUnsavedOpen(false);
          const id = await save();

          if (id) {
            toast.success(t('toast.saved'));
            onClose();
          } else {
            setUnsavedOpen(true);
          }
        }}
      />
    </div>
  );

  return createPortal(content, document.body);
};

/** Subscribes to the sheet so the bar/sheet swap re-renders. */
const PhoneSheetGate: React.FC<{
  boxes: BoxMap;
  onTooLarge: (info: { fileName: string; size: number }) => void;
  onPublish: () => void;
}> = ({ boxes, onTooLarge, onPublish }) => {
  const sheet = useEditorStore((s) => s.sheet);

  return sheet ? (
    <PhoneSheet boxes={boxes} onTooLarge={onTooLarge} />
  ) : (
    <PhoneBar onPublish={onPublish} />
  );
};

/**
 * Shows the "contest not accessible" dialog once per bound contest when the
 * snapshot request fails (rows already fell back to live). Choosing live
 * rewrites the binding; "manual" opens the Data panel on an empty list.
 */
const ContestAccessGate: React.FC = () => {
  const { inaccessible } = useDesignData();
  const data = useEditorStore((s) => s.design.data);
  const setData = useEditorStore((s) => s.setData);
  const setPanel = useEditorStore((s) => s.setPanel);
  const setSheet = useEditorStore((s) => s.setSheet);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const pushModal = useEditorStore((s) => s.pushModal);
  const popModal = useEditorStore((s) => s.popModal);
  const contestId = data.source === 'contest' ? data.contestId : null;
  const show = !!inaccessible && !!contestId && dismissed !== contestId;

  useEffect(() => {
    if (!show) return undefined;
    pushModal();

    return () => popModal();
  }, [show, pushModal, popModal]);

  return (
    <ContestAccessDialog
      contestName={show ? inaccessible!.contestName : null}
      onUseLive={() => {
        setDismissed(contestId);
        setData({ source: 'live' });
      }}
      onUseManual={() => {
        setDismissed(contestId);
        setData({ source: 'manual', rows: [] });
        setPanel('data');
        setSheet('data');
      }}
    />
  );
};

export default GraphicsEditor;
