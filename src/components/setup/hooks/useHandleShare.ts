import { toast } from 'react-toastify';

import { shareLink } from '@/helpers/fileActions';
import { buildShareUrl } from '@/helpers/shareUrl';

type ShareableItem = 'theme' | 'contest' | 'profile' | 'design';

export const useHandleShare = () => {
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

      // Not translated because in theory it shouldn't be displayed
      if (result === 'copied') toast.success('Link copied to clipboard!');
      if (result === 'unsupported') {
        toast.error('Sharing is not supported on this device.');
      }
    } catch (error: any) {
      console.error('Failed to share theme:', error);
    }
  };

  return handleShare;
};
