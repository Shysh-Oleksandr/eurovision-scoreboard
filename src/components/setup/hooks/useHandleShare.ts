import { toast } from 'react-toastify';

type ShareableItem = 'theme' | 'contest' | 'profile';

export const useHandleShare = () => {
  const handleShare = (
    queryParamKey: ShareableItem,
    queryParamValue: string,
    title: string,
  ) => {
    try {
      const url = window.location.href + `?${queryParamKey}=${queryParamValue}`;
      const data = {
        title,
        url,
      };

      if (navigator.canShare && navigator.canShare(data)) {
        navigator.share(data);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(data.url);
        // Not translated because in theory it shouldn't be displayed
        toast.success('Link copied to clipboard!');
      } else {
        toast.error('Sharing is not supported on this device.');
      }
    } catch (error: any) {
      console.error('Failed to share theme:', error);
    }
  };

  return handleShare;
};
