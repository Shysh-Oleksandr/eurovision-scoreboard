import { useTranslations } from 'next-intl';
import React from 'react';

import StatsFlag, { useFlagSettings } from './StatsFlag';
import { StageRankings } from './statsRankings';

import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { Country } from '@/models';

interface SummaryViewProps {
  rankings: StageRankings;
  getPoints: (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ) => number;
}

/**
 * The stage's result: one row per entry in final order, with its total and,
 * when the stage has both, the jury and televote points and places. A thin
 * bar under each name draws the total against the winner's, split into its
 * jury and televote parts (their swatches sit in the column headers).
 */
const SummaryView = ({ rankings, getPoints }: SummaryViewProps) => {
  const t = useTranslations('simulation.finalStats');
  const flagSettings = useFlagSettings();
  const { hasSplit, byTotal, juryPlace, televotePlace, maxTotal } = rankings;

  const place = (value: number | undefined) =>
    value === undefined ? '' : t('placeOrdinal', { place: value });

  const channelHeader = (channel: 'jury' | 'televote') => (
    <th scope="col" className="dp-stats-num">
      <span className="dp-stats-pp-head">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`dp-stats-swatch ${
              channel === 'jury' ? 'is-jury' : 'is-tele'
            }`}
          />
          {t(channel)}
        </span>
        <span aria-hidden="true" className="dp-stats-sub">
          <span>{t('points')}</span>
          <span>{t('place')}</span>
        </span>
      </span>
    </th>
  );

  return (
    <div className="dp-stats-scroll narrow-scrollbar h-full">
      <table className="dp-stats-table dp-stats-summary">
        <thead>
          <tr>
            <th scope="col" className="dp-stats-rowhead">
              <span className="dp-stats-rowhead-in">
                <span className="dp-stats-place" />
                <span className="text-left">{t('country')}</span>
              </span>
            </th>
            <th scope="col" className="dp-stats-num">
              {hasSplit ? t('total') : t('points')}
            </th>
            {hasSplit && channelHeader('jury')}
            {hasSplit && channelHeader('televote')}
          </tr>
        </thead>
        <tbody>
          {byTotal.map((country, index) => {
            const total = getPoints(country, 'combined');
            const jury = getPoints(country, 'jury');
            const televote = getPoints(country, 'televote');

            return (
              <tr key={country.code}>
                <th scope="row" className="dp-stats-rowhead">
                  <span className="dp-stats-rowhead-in">
                    <span className="dp-stats-place">{index + 1}</span>
                    <StatsFlag country={country} settings={flagSettings} />
                    <span className="min-w-0 flex-1 flex flex-col gap-[5px]">
                      <span className="dp-stats-name">{country.name}</span>
                      {hasSplit && maxTotal > 0 && (
                        <span
                          aria-hidden="true"
                          className="dp-stats-bar"
                          style={{ width: `${(total / maxTotal) * 100}%` }}
                        >
                          <i className="is-jury" style={{ flexGrow: jury }} />
                          <i
                            className="is-tele"
                            style={{ flexGrow: televote }}
                          />
                        </span>
                      )}
                    </span>
                  </span>
                </th>
                <td className="dp-stats-num dp-stats-total">
                  {toFixedIfDecimalFloat(total)}
                </td>
                {hasSplit && (
                  <>
                    <td className="dp-stats-num">
                      <span className="dp-stats-pp">
                        <span className="dp-stats-pts">
                          {toFixedIfDecimalFloat(jury)}
                        </span>
                        <span className="dp-stats-plc">
                          {place(juryPlace.get(country.code))}
                        </span>
                      </span>
                    </td>
                    <td className="dp-stats-num">
                      <span className="dp-stats-pp">
                        <span className="dp-stats-pts">
                          {toFixedIfDecimalFloat(televote)}
                        </span>
                        <span className="dp-stats-plc">
                          {place(televotePlace.get(country.code))}
                        </span>
                      </span>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SummaryView;
