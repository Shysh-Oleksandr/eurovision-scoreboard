'use client';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import BetaBadge from '@/components/common/BetaBadge';
import WidgetContainer from '@/components/common/WidgetContainer';
import { useGraphicsStudioStore } from '@/graphics/state/graphicsStudioStore';
import { countDesigns } from '@/graphics/storage/designsDb';

const GraphicsModal = dynamic(() => import('./GraphicsModal'), {
  ssr: false,
});

interface Props {
  /** Signed out, the widget shows just its name, like the other libraries. */
  signedIn: boolean;
  /** "N saved" from the profile summary. */
  cloudStat?: string;
  statLoading?: boolean;
}

/** Hub widget (beta): opens the Graphics modal on "My designs". */
const GraphicsWidget = ({ signedIn, cloudStat, statLoading }: Props) => {
  const t = useTranslations('graphics.widget');
  const isOpen = useGraphicsStudioStore((s) => s.isGraphicsModalOpen);
  const setOpen = useGraphicsStudioStore((s) => s.setGraphicsModalOpen);
  const draftsVersion = useGraphicsStudioStore((s) => s.draftsVersion);
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    countDesigns().then((n) => {
      if (!cancelled) setCount(n);
    });

    return () => {
      cancelled = true;
    };
  }, [draftsVersion, isOpen]);

  const localStat =
    count === 0 ? t('noDesignsYet') : t('nDesigns', { count: count ?? 0 });

  return (
    <>
      <WidgetContainer
        onClick={() => setOpen(true)}
        title={t('title')}
        badge={<BetaBadge />}
        stat={
          signedIn && count !== null
            ? `${localStat}${cloudStat ? `, ${cloudStat}` : ''}`
            : undefined
        }
        shortStat={localStat}
        statLoading={signedIn && (count === null || !!statLoading)}
        icon={<Sparkles className="size-[21px] flex-none" />}
      />
      {(isOpen || loaded) && (
        <GraphicsModal
          isOpen={isOpen}
          onClose={() => setOpen(false)}
          onLoaded={() => setLoaded(true)}
        />
      )}
    </>
  );
};

export default GraphicsWidget;
