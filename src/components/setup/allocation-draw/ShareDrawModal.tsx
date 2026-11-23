'use client';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { DrawShareData } from './drawShare';
import { useDrawUiStore } from './drawUiStore';

import {
  FormatShape,
  ShareGroup,
  ShareLinkButton,
  ShareSegmented,
  ShareTextField,
  ShareToggle,
} from '@/components/simulation/share/controls';
import ShareImageModal from '@/components/simulation/share/ShareImageModal';
import { useGraphicsStudioStore } from '@/graphics/state/graphicsStudioStore';
import { buildDrawDesign } from '@/graphics/templates/draw';
import { toEditableDesign } from '@/graphics/templates/editor';
import { buildShareUrl } from '@/helpers/shareUrl';
import { ShareImageAspectRatio, useGeneralStore } from '@/state/generalStore';

interface ShareDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded?: () => void;
  data: DrawShareData;
  overlayClassName?: string;
}

/** Every export is 2× the design: 2400 × 1260 for Wide. */
const EXPORT_OPTIONS = {
  scale: 2,
  format: 'jpeg' as const,
  quality: 0.9,
};

/**
 * "Share the draw": the semi-finals a draw produced, as an image in the
 * share modal's frame (DESIGN.md "Share image modal"). Heart flags by
 * default; the pre-qualified voters' line is off until switched on. The
 * format, flags and voters choices carry over between opens; the text
 * starts from the contest's name every time.
 */
const ShareDrawModal: React.FC<ShareDrawModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
  data,
  overlayClassName = '!z-[1003]',
}) => {
  const t = useTranslations('setup.allocationDraw');
  const ts = useTranslations('share');
  const tc = useTranslations('common');
  const tg = useTranslations('graphics.share');
  const contestName = useGeneralStore((s) => s.settings.contestName);
  const contestYear = useGeneralStore((s) => s.settings.contestYear);
  const activeContest = useGeneralStore((s) => s.activeContest);
  const white2026 = useGeneralStore(
    (s) => s.settings.shouldUse2026WhiteHeartFlags,
  );
  const options = useDrawUiStore((s) => s.shareOptions);
  const setOptions = useDrawUiStore((s) => s.setShareOptions);
  const openEditor = useGraphicsStudioStore((s) => s.openEditor);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const defaultTitle = `${contestName} ${contestYear}`.trim();
  const defaultSubtitle = t('shareSubtitle');
  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState(defaultSubtitle);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(defaultTitle);
    setSubtitle(defaultSubtitle);
    onLoaded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const hasVoters = data.semis.some((semi) => semi.voters.length > 0);
  const firstHalf = t('firstHalf');
  const secondHalf = t('secondHalf');
  const alsoVoting = t('shareAlsoVoting');

  const design = useMemo(
    () =>
      buildDrawDesign({
        aspectRatio: options.aspectRatio,
        title,
        subtitle,
        order: data.order,
        semis: data.semis,
        flagStyle: options.flagStyle,
        use2026WhiteHeart: white2026,
        showVoters: hasVoters && options.showVoters,
        labels: { firstHalf, secondHalf, voters: alsoVoting },
      }),
    [
      options.aspectRatio,
      options.flagStyle,
      options.showVoters,
      title,
      subtitle,
      data,
      white2026,
      hasVoters,
      firstHalf,
      secondHalf,
      alsoVoting,
    ],
  );

  const isDefaultText = title === defaultTitle && subtitle === defaultSubtitle;

  const primaryOptions = (
    <ShareGroup label={ts('format')}>
      <ShareSegmented
        ariaLabel={ts('format')}
        value={options.aspectRatio}
        onChange={(aspectRatio) => setOptions({ aspectRatio })}
        options={[
          {
            value: ShareImageAspectRatio.LANDSCAPE,
            label: ts('formatWide'),
            icon: <FormatShape kind="wide" />,
          },
          {
            value: ShareImageAspectRatio.SQUARE,
            label: ts('formatSquare'),
            icon: <FormatShape kind="square" />,
          },
          {
            value: ShareImageAspectRatio.PORTRAIT,
            label: ts('formatTall'),
            icon: <FormatShape kind="tall" />,
          },
        ]}
      />
    </ShareGroup>
  );

  const moreOptions = (
    <>
      <ShareGroup
        label={ts('text')}
        aside={
          !isDefaultText && (
            <ShareLinkButton
              onClick={() => {
                setTitle(defaultTitle);
                setSubtitle(defaultSubtitle);
              }}
            >
              {tc('reset')}
            </ShareLinkButton>
          )
        }
      >
        <ShareTextField label={tc('title')} value={title} onChange={setTitle} />
        <ShareTextField
          label={tc('subtitle')}
          value={subtitle}
          onChange={setSubtitle}
        />
      </ShareGroup>

      <ShareGroup label={t('shareFlags')}>
        <ShareSegmented
          ariaLabel={t('shareFlags')}
          value={options.flagStyle}
          onChange={(flagStyle) => setOptions({ flagStyle })}
          options={[
            { value: 'heart', label: t('shareHearts') },
            { value: 'theme', label: t('shareThemeFlags') },
          ]}
        />
      </ShareGroup>

      {hasVoters && (
        <ShareGroup label={ts('show')}>
          <ShareToggle
            label={t('shareShowVoters')}
            pressed={options.showVoters}
            onChange={(showVoters) => setOptions({ showVoters })}
          />
        </ShareGroup>
      )}
    </>
  );

  const caption = data.semis.map((semi) => semi.name).join(' · ');
  const fileTitle = title || defaultTitle;

  return (
    <ShareImageModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('shareTitle')}
      caption={caption}
      overlayClassName={overlayClassName}
      design={design}
      contentKey={data}
      data={{ binding: design.data }}
      exportOptions={EXPORT_OPTIONS}
      primaryOptions={primaryOptions}
      moreOptions={moreOptions}
      customizeSummary={
        hasVoters ? t('shareCustomizeSummary') : t('shareCustomizeSummaryShort')
      }
      customizeOpen={customizeOpen}
      onCustomizeOpenChange={setCustomizeOpen}
      onOpenEditor={() =>
        openEditor({
          design: toEditableDesign(design, { name: tg('drawDesign') }),
          draftId: null,
          selectId: 'draw',
        })
      }
      saveFileName={() =>
        `${fileTitle} - ${
          subtitle || defaultSubtitle
        } - DouzePoints.app - ${Date.now()}.jpg`
      }
      share={{
        fileName: `${fileTitle} - DouzePoints.app.jpg`,
        title: fileTitle,
        text: subtitle || defaultSubtitle,
        url: buildShareUrl(activeContest ? { contest: activeContest._id } : {}),
      }}
    />
  );
};

export default ShareDrawModal;
