import { useTranslations } from 'next-intl';

import Image from 'next/image';

import Button from '../common/Button';

import { ArrowDownAndUpIcon } from '@/assets/icons/ArrowDownAndUpIcon';
import { PlusIcon } from '@/assets/icons/PlusIcon';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface ContestCardProps {
  onReorderClick?: () => void;
  onAddStageClick?: () => void;
}

const ContestCard: React.FC<ContestCardProps> = ({
  onReorderClick,
  onAddStageClick,
}) => {
  const t = useTranslations('simulation.header');

  const contestName = useGeneralStore((state) => state.settings.contestName);
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const showHostingCountryLogo = useGeneralStore(
    (state) => state.settings.showHostingCountryLogo,
  );
  const getHostingCountry = useGeneralStore((state) => state.getHostingCountry);

  const { logo, isExisting } = getHostingCountryLogo(getHostingCountry());

  return (
    <div
      className={`w-full bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 p-3 text-white rounded-lg border border-primary-900 shadow-lg border-solid`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {showHostingCountryLogo && (
            <Image
              src={logo}
              alt={t('hostingCountryLogo')}
              className={`flex-none rounded-sm ${
                isExisting
                  ? 'w-8 h-8 overflow-visible'
                  : 'w-8 h-6 object-cover mr-1'
              }`}
              width={32}
              height={32}
              onError={(e) => {
                e.currentTarget.src = getFlagPath('ww');
              }}
              unoptimized
            />
          )}
          <h5 className="text-base font-semibold">
            {contestName} {contestYear}
          </h5>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onReorderClick}
            variant="tertiary"
            title="Reorder"
            aria-label="Reorder"
            Icon={<ArrowDownAndUpIcon className="w-5 h-5" />}
          />
          <Button
            onClick={onAddStageClick}
            title="Add Stage"
            aria-label="Add Stage"
            Icon={<PlusIcon className="w-5 h-5" />}
          />
        </div>
      </div>
    </div>
  );
};

export default ContestCard;
