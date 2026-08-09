import { useTranslations } from 'next-intl';
import { useCallback, type JSX } from 'react';

import { useShallow } from 'zustand/shallow';

import Button from '../../common/Button';
import CountryInfo from '../../controlsPanel/CountryInfo';
import SnowPileEffect from '../../effects/SnowPileEffect';

import { useHotKey } from '@/hooks/useHotKey';
import { StageVotingMode } from '@/models';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { useQualifiedCountriesPanelGlowStyle } from '@/theme/useQualifiedCountriesPanelGlowStyle';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

type Props = {
  isScalePhase: boolean;
  /** True on the beat after the last award, before the stage is committed. */
  isAwaitingFinish: boolean;
  /** Value the next advance reveals; null once the countdown is done. */
  nextStepPoints: number | null;
};

/**
 * Controls for the scale-countdown board. Deliberately a separate component from
 * `ControlsPanel` — it only shares the panel chrome, and the default panel's
 * per-spokesperson points strip means nothing during the countdown.
 */
const RevealControls = ({
  isScalePhase,
  isAwaitingFinish,
  nextStepPoints,
}: Props): JSX.Element => {
  const t = useTranslations('simulation');
  const { roundedCountryContainer } = useThemeSpecifics();
  const roundedPanelGlowStyle = useQualifiedCountriesPanelGlowStyle(
    roundedCountryContainer,
  );

  const { advance, finishRandomly, votingCountryIndex, votingMode } =
    useScoreboardStore(
      useShallow((state) => ({
        advance: state.advanceJuryScaleReveal,
        finishRandomly: state.finishJuryScaleRevealRandomly,
        votingCountryIndex: state.votingCountryIndex,
        votingMode: state.getCurrentStage()?.votingMode,
      })),
    );

  const hasTelevoteNext = votingMode === StageVotingMode.JURY_AND_TELEVOTE;

  const onFinishRandomly = useCallback(() => {
    finishRandomly();
  }, [finishRandomly]);

  useHotKey('f', onFinishRandomly);

  return (
    <div
      className={`relative flex-1 bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 ${
        roundedCountryContainer
          ? 'qualified-countries-panel--rounded'
          : 'rounded-[10px]'
      } lg:px-4 px-3 lg:py-4 py-3 flex flex-col xs:flex-row xs:items-center gap-3`}
      style={roundedPanelGlowStyle}
    >
      <SnowPileEffect snowEffect="middle" className="!w-full" />

      <div className="flex-1 min-w-0">
        {isAwaitingFinish || isScalePhase ? (
          <>
            <h4 className="text-white uppercase lg:text-2xl text-xl">
              {isAwaitingFinish
                ? t('juryScaleReveal.juryVoteComplete')
                : t('juryScaleReveal.awardingPoints', {
                    count: nextStepPoints ?? 0,
                  })}
            </h4>
            <h5 className="uppercase text-white/50 lg:text-sm text-xs lg:mt-1 mt-2">
              {t('juryScaleReveal.title')}
            </h5>
          </>
        ) : (
          <CountryInfo
            votingCountryIndex={votingCountryIndex}
            containerClassName="w-full"
          />
        )}
      </div>

      <div className="flex gap-2 xs:flex-none">
        {isAwaitingFinish ? (
          <Button
            label={
              hasTelevoteNext
                ? t('juryScaleReveal.continueToTelevote')
                : t('juryScaleReveal.showResults')
            }
            onClick={advance}
            className="animated-border"
            snowEffect="middle"
          />
        ) : (
          <>
            <Button
              variant="tertiary"
              label={t('random')}
              onClick={advance}
              snowEffect="middle"
            />
            <Button label={t('finishRandomly')} onClick={onFinishRandomly} />
          </>
        )}
      </div>
    </div>
  );
};

export default RevealControls;
