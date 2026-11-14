import Button from '../common/Button';
import { Checkbox } from '../common/Checkbox';
import { Input } from '../Input';

import { useTelevoteEntry } from './useTelevoteEntry';

import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';

const TelevoteInput = () => {
  const {
    t,
    countries,
    televotingProgress,
    televoteProgress,
    shouldLimitManualTelevotePoints,
    revealTelevoteLowestToHighest,
    enteredPoints,
    error,
    disableLimit,
    setDisableLimit,
    disableLimitForShow,
    setDisableLimitForShow,
    handleInputChange,
    handleVoting,
    isVoteDisabled,
  } = useTelevoteEntry();

  return (
    <div className="w-full pb-1 lg:pt-3 pt-2 lg:px-4 px-3 rounded-md rounded-b-none">
      <label
        className="lg:text-[1.35rem] text-lg text-white"
        htmlFor="televoteInput"
      >
        {t('simulation.enterTelevotePoints')}
      </label>

      <h5 className="uppercase text-white/50 lg:text-sm text-xs mt-2 mb-1">
        {t.rich('simulation.ordinalOfCountries', {
          index: televotingProgress + 1,
          length: countries?.length ?? 0,
          span: (chunks: React.ReactNode) => (
            <span className="font-medium">{chunks}</span>
          ),
        })}
      </h5>

      {/* Progress bar for televote points when limiting is enabled */}
      {shouldLimitManualTelevotePoints && televoteProgress && (
        <div className="mt-3">
          <div className="w-full bg-primary-900 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                disableLimit || disableLimitForShow
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-primary-800 to-primary-700'
              }`}
              style={{
                width: `${Math.min(televoteProgress.progressPercentage, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs gap-1 text-white/50 mt-1">
            <span>
              {t('simulation.awarded', {
                count: toFixedIfDecimalFloat(
                  televoteProgress.totalAwardedPoints,
                ),
                totalAvailablePoints: toFixedIfDecimalFloat(
                  televoteProgress.totalAvailablePoints,
                ),
              })}
            </span>
            {(disableLimit || disableLimitForShow) && (
              <span className="text-yellow-400 text-right">
                ⚠️ {t('simulation.limitDisabled')}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex overflow-hidden">
        <Input
          className="w-full lg:!pt-3 md:!pt-2 !pt-1 lg:!pb-2 md:!pb-1 !pb-[2px] !px-2 !mt-2 lg:text-base text-sm !min-w-[70px]"
          name="televoteInput"
          id="televoteInput"
          type="number"
          placeholder={t('simulation.enterPoints')}
          value={enteredPoints}
          onChange={handleInputChange}
        />
        <Button
          label={
            revealTelevoteLowestToHighest
              ? t('common.save')
              : t('simulation.vote')
          }
          onClick={handleVoting}
          className="mt-2 ml-2 md:px-4 !px-6"
          disabled={isVoteDisabled}
        />
      </div>
      {error !== '' && (
        <div className="lg:ml-2 ml-1 lg:pt-2 pt-1">
          <h5 className="text-red-400 font-medium lg:text-[0.95rem] text-sm">
            {error}
          </h5>
          {shouldLimitManualTelevotePoints && televoteProgress && (
            <div className="mt-1 space-y-1 text-white">
              <Checkbox
                id="disableLimit"
                label={t('simulation.disableLimitForThisVote')}
                checked={disableLimit}
                onChange={(e) => setDisableLimit(e.target.checked)}
                labelClassName="!p-0 !px-1 [&>span]:!text-sm"
              />
              <Checkbox
                id="disableLimitForShow"
                label={t('simulation.disableLimitForThisShow')}
                checked={disableLimitForShow}
                onChange={(e) => setDisableLimitForShow(e.target.checked)}
                labelClassName="!p-0 !px-1 [&>span]:!text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TelevoteInput;
