import { toastWithAction } from '@/components/common/ToastBody';
import { buildShareUrl } from '@/helpers/shareUrl';
import { toast } from '@/helpers/toast';

interface SavedToastLabels {
  copyLink: string;
  copied: string;
}

/**
 * The toast after a contest is saved from the dialog. A public contest gets a
 * Copy link action: it can be shared right away. The action answers in place
 * ("Copied") instead of raising a second toast.
 */
export const showContestSavedToast = (
  message: string,
  contest: { _id: string; isPublic: boolean },
  labels: SavedToastLabels,
): void => {
  if (!contest.isPublic) {
    toast.success(message);

    return;
  }

  toastWithAction({
    message,
    action: labels.copyLink,
    doneLabel: labels.copied,
    onAction: () =>
      navigator.clipboard.writeText(buildShareUrl({ contest: contest._id })),
  });
};
