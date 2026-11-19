import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import {
  AutoShareLayout,
  getAutoShareLayout,
  SHARE_ITEM_SIZES,
  SHARE_MAX_COLUMNS,
} from './autoLayout';
import {
  FormatShape,
  ShareAutoNote,
  ShareGroup,
  ShareLinkButton,
  ShareSegmented,
  ShareStepper,
  ShareTextField,
  ShareToggle,
} from './controls';
import ShareImageModal from './ShareImageModal';

import { useCountryDisplay, useCountrySorter } from '@/components/board/hooks';
import { useGraphicsStudioStore } from '@/graphics/state/graphicsStudioStore';
import { toEditableDesign } from '@/graphics/templates/editor';
import { buildResultsDesign } from '@/graphics/templates/results';
import { buildShareUrl } from '@/helpers/shareUrl';
import { Country, StageId, StageVotingMode } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { ShareImageAspectRatio, useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

interface ShareResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
  /** When provided, use this ordered list instead of scoreboard (e.g. for running order share) */
  countriesOverride?: Country[];
  titleOverride?: string;
  subtitleOverride?: string;
  /** The stage named in the modal's header; the viewed stage by default. */
  stageName?: string;
  isRunningOrder?: boolean;
}

/** Every export is 2× the design: 2400 × 1260 for Wide, on every device. */
const EXPORT_OPTIONS = {
  scale: 2,
  format: 'jpeg' as const,
  quality: 0.9,
};

/** Clothing sizes read the same in every language. */
const ROW_SIZE_LABELS = {
  sm: 'S',
  md: 'M',
  lg: 'L',
  xl: 'XL',
  '2xl': 'XXL',
} as const;

type CountriesMode = 'all' | 'top10' | 'custom';

const TOP_PRESET = 10;

/** The auto layout without the parts a manual layout keeps. */
const withoutLayout = (auto: AutoShareLayout): Partial<AutoShareLayout> => {
  const rest: Partial<AutoShareLayout> = { ...auto };

  delete rest.layout;
  delete rest.itemSize;
  delete rest.shortCountryNames;

  return rest;
};

const ShareResultsModal: React.FC<ShareResultsModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
  countriesOverride,
  titleOverride,
  subtitleOverride,
  stageName,
  isRunningOrder = false,
}) => {
  const t = useTranslations('share');
  const tc = useTranslations('common');
  const tg = useTranslations('graphics.share');

  const imageCustomization = useGeneralStore(
    (state) => state.imageCustomization,
  );
  const setImageCustomization = useGeneralStore(
    (state) => state.setImageCustomization,
  );
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const activeContest = useGeneralStore((state) => state.activeContest);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const currentStageId = useScoreboardStore(
    (state) => state.viewedStageId || state.currentStageId,
  );
  const votingCountryIndex = useScoreboardStore(
    (state) => state.votingCountryIndex,
  );
  const televotingProgress = useScoreboardStore(
    (state) => state.televotingProgress,
  );
  const getVotingCountriesLength = useCountriesStore(
    (state) => state.getVotingCountriesLength,
  );
  const openEditor = useGraphicsStudioStore((state) => state.openEditor);

  const currentStage = eventStages.find((stage) => stage.id === currentStageId);
  const { id, name, isOver, isJuryVoting, votingMode, countries } =
    currentStage || {};

  const { title: defaultTitle, subtitle: defaultSubtitle } = useMemo(() => {
    if (titleOverride !== undefined && subtitleOverride !== undefined) {
      return { title: titleOverride, subtitle: subtitleOverride };
    }

    const isGf = id?.toUpperCase() === StageId.GF.toUpperCase();

    let title = `${contestName} ${contestYear}`;
    let subtitle = isGf ? `Final Results - ${name}` : name;

    if (!isOver) {
      title = `${contestName} ${contestYear} - ${name}`;

      if (isJuryVoting) {
        subtitle =
          votingCountryIndex === 0
            ? name
            : `${votingCountryIndex} of ${getVotingCountriesLength()} countries voted`;
      } else if (
        (votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
          votingMode === StageVotingMode.COMBINED) &&
        televotingProgress === 0
      ) {
        subtitle = 'Jury results';
      } else {
        subtitle = `${televotingProgress} of ${countries?.length} televotes revealed`;
      }
    }

    return { title, subtitle: subtitle ?? '' };
  }, [
    titleOverride,
    subtitleOverride,
    id,
    contestName,
    contestYear,
    name,
    isOver,
    isJuryVoting,
    votingMode,
    televotingProgress,
    votingCountryIndex,
    getVotingCountriesLength,
    countries?.length,
  ]);

  const allCountriesToDisplay = useCountryDisplay();
  const sortedCountriesFromBoard = useCountrySorter(allCountriesToDisplay);
  const sortedCountries = countriesOverride ?? sortedCountriesFromBoard;
  const total = sortedCountries.length;

  const {
    aspectRatio,
    maxCountries,
    layout,
    itemSize,
    showRankings,
    shortCountryNames,
  } = imageCustomization;
  const showPoints = isRunningOrder
    ? imageCustomization.showPointsForRunningOrder
    : imageCustomization.showPoints;
  // A running order always shows every country.
  const limit =
    !isRunningOrder && maxCountries > 0 && maxCountries < total
      ? maxCountries
      : 0;
  const shownCount = limit || total;
  const auto = getAutoShareLayout(shownCount, aspectRatio);
  const isAutoLayout = layout === auto.layout && itemSize === auto.itemSize;

  // The share image as a design document (docs/graphics-studio.md). Keyed
  // on what the image shows, so opening Customize doesn't re-export it.
  const {
    title,
    subtitle,
    titleFontSize,
    subtitleFontSize,
    brandingFontSize,
    verticalPadding,
    horizontalPadding,
  } = imageCustomization;
  const design = useMemo(
    () =>
      buildResultsDesign({
        settings: {
          ...useGeneralStore.getState().imageCustomization,
          aspectRatio,
          title,
          subtitle,
          titleFontSize,
          subtitleFontSize,
          brandingFontSize,
          verticalPadding,
          horizontalPadding,
          layout,
          itemSize,
          showRankings,
          shortCountryNames,
          maxCountries: limit,
        },
        showPoints,
        statusMode: countriesOverride ? 'uniform' : 'live',
        dataSource: countriesOverride ? 'provided' : 'live',
      }),
    [
      aspectRatio,
      title,
      subtitle,
      titleFontSize,
      subtitleFontSize,
      brandingFontSize,
      verticalPadding,
      horizontalPadding,
      layout,
      itemSize,
      showRankings,
      shortCountryNames,
      limit,
      showPoints,
      countriesOverride,
    ],
  );

  // A fresh image for every open: the stage's own title, all countries, the
  // auto layout. The format and the Show toggles carry over.
  const [customCountries, setCustomCountries] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomCountries(false);
      setImageCustomization({
        title: defaultTitle,
        subtitle: defaultSubtitle,
        maxCountries: 0,
        ...getAutoShareLayout(
          total,
          useGeneralStore.getState().imageCustomization.aspectRatio,
        ),
      });
      onLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const setFormat = (ratio: ShareImageAspectRatio) =>
    setImageCustomization({
      aspectRatio: ratio,
      ...getAutoShareLayout(shownCount, ratio),
    });

  /** A new number of rows keeps a manual layout, else re-fits it. */
  const setLimit = (next: number, custom: boolean) => {
    const nextLimit = next > 0 && next < total ? next : 0;
    const nextAuto = getAutoShareLayout(nextLimit || total, aspectRatio);

    setCustomCountries(custom);
    setImageCustomization({
      maxCountries: nextLimit,
      ...(isAutoLayout ? nextAuto : withoutLayout(nextAuto)),
    });
  };

  const countriesMode: CountriesMode =
    limit === 0
      ? 'all'
      : limit === TOP_PRESET && !customCountries
      ? 'top10'
      : 'custom';

  const setCountriesMode = (mode: CountriesMode) => {
    if (mode === 'all') setLimit(0, false);
    if (mode === 'top10') setLimit(TOP_PRESET, false);
    if (mode === 'custom') {
      setLimit(limit || Math.min(5, total - 1), true);
    }
  };

  const sizeIndex = Math.max(0, SHARE_ITEM_SIZES.indexOf(itemSize));
  const maxColumns = Math.min(SHARE_MAX_COLUMNS, shownCount);

  const isDefaultText = title === defaultTitle && subtitle === defaultSubtitle;

  const primaryOptions = (
    <ShareGroup label={t('format')}>
      <ShareSegmented
        ariaLabel={t('format')}
        value={aspectRatio}
        onChange={setFormat}
        options={[
          {
            value: ShareImageAspectRatio.LANDSCAPE,
            label: t('formatWide'),
            icon: <FormatShape kind="wide" />,
          },
          {
            value: ShareImageAspectRatio.SQUARE,
            label: t('formatSquare'),
            icon: <FormatShape kind="square" />,
          },
          {
            value: ShareImageAspectRatio.PORTRAIT,
            label: t('formatTall'),
            icon: <FormatShape kind="tall" />,
          },
        ]}
      />
    </ShareGroup>
  );

  const moreOptions = (
    <>
      <ShareGroup
        label={t('text')}
        aside={
          !isDefaultText && (
            <ShareLinkButton
              onClick={() =>
                setImageCustomization({
                  title: defaultTitle,
                  subtitle: defaultSubtitle,
                })
              }
            >
              {tc('reset')}
            </ShareLinkButton>
          )
        }
      >
        <ShareTextField
          label={tc('title')}
          value={title}
          onChange={(value) => setImageCustomization({ title: value })}
        />
        <ShareTextField
          label={tc('subtitle')}
          value={subtitle}
          onChange={(value) => setImageCustomization({ subtitle: value })}
        />
      </ShareGroup>

      {!isRunningOrder && total > 1 && (
        <ShareGroup label={t('countries')}>
          <ShareSegmented
            ariaLabel={t('countries')}
            value={countriesMode}
            onChange={setCountriesMode}
            options={[
              { value: 'all', label: t('allCountries', { count: total }) },
              ...(total > TOP_PRESET
                ? [
                    {
                      value: 'top10' as const,
                      label: t('topCountries', { count: TOP_PRESET }),
                    },
                  ]
                : []),
              { value: 'custom', label: t('customCount') },
            ]}
          />
          {countriesMode === 'custom' && (
            <ShareStepper
              label={t('showTheTop')}
              number={{
                value: limit,
                min: 1,
                max: total - 1,
                onChange: (n) => setLimit(n, true),
              }}
              onDecrease={() => setLimit(limit - 1, true)}
              onIncrease={() => setLimit(limit + 1, true)}
              canDecrease={limit > 1}
              canIncrease={limit < total - 1}
              decreaseLabel={t('fewerCountries')}
              increaseLabel={t('moreCountries')}
            />
          )}
        </ShareGroup>
      )}

      <ShareGroup label={t('show')}>
        <div className="grid grid-cols-3 gap-1.5">
          <ShareToggle
            label={t('places')}
            pressed={showRankings}
            onChange={(on) => setImageCustomization({ showRankings: on })}
          />
          <ShareToggle
            label={t('points')}
            pressed={showPoints}
            onChange={(on) =>
              setImageCustomization(
                isRunningOrder
                  ? { showPointsForRunningOrder: on }
                  : { showPoints: on },
              )
            }
          />
          <ShareToggle
            label={t('shortNames')}
            pressed={shortCountryNames}
            onChange={(on) => setImageCustomization({ shortCountryNames: on })}
          />
        </div>
      </ShareGroup>

      <ShareGroup
        label={t('layout')}
        aside={
          isAutoLayout ? (
            <ShareAutoNote>{t('auto')}</ShareAutoNote>
          ) : (
            <ShareLinkButton onClick={() => setImageCustomization(auto)}>
              {tc('reset')}
            </ShareLinkButton>
          )
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          <ShareStepper
            label={t('columns')}
            value={String(layout)}
            onDecrease={() => setImageCustomization({ layout: layout - 1 })}
            onIncrease={() => setImageCustomization({ layout: layout + 1 })}
            canDecrease={layout > 1}
            canIncrease={layout < maxColumns}
            decreaseLabel={t('fewerColumns')}
            increaseLabel={t('moreColumns')}
          />
          <ShareStepper
            label={t('rowSize')}
            value={ROW_SIZE_LABELS[SHARE_ITEM_SIZES[sizeIndex]]}
            onDecrease={() =>
              setImageCustomization({
                itemSize: SHARE_ITEM_SIZES[sizeIndex - 1],
              })
            }
            onIncrease={() =>
              setImageCustomization({
                itemSize: SHARE_ITEM_SIZES[sizeIndex + 1],
              })
            }
            canDecrease={sizeIndex > 0}
            canIncrease={sizeIndex < SHARE_ITEM_SIZES.length - 1}
            decreaseLabel={t('smallerRows')}
            increaseLabel={t('biggerRows')}
          />
        </div>
      </ShareGroup>
    </>
  );

  const fileTitle = title || defaultTitle;

  return (
    <ShareImageModal
      isOpen={isOpen}
      onClose={onClose}
      title={isRunningOrder ? t('titleRunningOrder') : t('titleResults')}
      caption={stageName ?? name}
      overlayClassName={countriesOverride ? '!z-[1003]' : '!z-[1001]'}
      design={design}
      contentKey={sortedCountries}
      data={{ binding: design.data, providedCountries: countriesOverride }}
      exportOptions={EXPORT_OPTIONS}
      primaryOptions={primaryOptions}
      moreOptions={moreOptions}
      customizeSummary={
        isRunningOrder
          ? t('customizeSummaryRunningOrder')
          : t('customizeSummaryResults')
      }
      customizeOpen={imageCustomization.isCustomizationExpanded}
      onCustomizeOpenChange={(open) =>
        setImageCustomization({ isCustomizationExpanded: open })
      }
      // "Open in editor": the same design, made self-contained (running-order
      // rows become a manual list) and opened in the graphics studio.
      onOpenEditor={() =>
        openEditor({
          design: toEditableDesign(design, {
            name: isRunningOrder
              ? tg('runningOrderDesign')
              : tg('resultsDesign'),
            providedCountries: countriesOverride,
          }),
          draftId: null,
          selectId: 'scoreboard',
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

export default ShareResultsModal;
