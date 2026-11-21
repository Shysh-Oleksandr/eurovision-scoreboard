import { useTranslations } from 'next-intl';

import { shareLink } from '@/helpers/fileActions';
import { buildShareUrl } from '@/helpers/shareUrl';
import { toast } from '@/helpers/toast';

type ShareableItem = 'theme' | 'contest' | 'profile' | 'design';

export const useHandleShare = () => {
  const t = useTranslations('graphics');

  const handleShare = async (
    queryParamKey: ShareableItem,
    queryParamValue: string,
    title: string,
  ) => {
    try {
      const result = await shareLink(
        buildShareUrl({ [queryParamKey]: queryParamValue }),
        title,
      );

      // Browsers without the share sheet (desktop Firefox) copy instead.
      if (result === 'copied') toast.success(t('gallery.toast.linkCopied'));
      if (result === 'unsupported') {
        toast.error(t('export.toast.shareUnsupported'));
      }
    } catch (error: any) {
      console.error('Failed to share theme:', error);
    }
  };

  return handleShare;
};
