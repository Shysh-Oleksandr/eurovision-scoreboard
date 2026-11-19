import { toast } from 'react-toastify';

import Button from '@/components/common/Button';
import { buildShareUrl } from '@/helpers/shareUrl';

interface SavedToastLabels {
  copyLink: string;
  linkCopied: string;
}

const SavedToastBody = ({
  message,
  contestId,
  labels,
}: {
  message: string;
  contestId: string;
  labels: SavedToastLabels;
}) => (
  <div className="flex flex-col items-start gap-2.5">
    <p className="text-[13px] font-semibold leading-5 text-balance">
      {message}
    </p>
    <Button
      size="sm"
      variant="surface"
      label={labels.copyLink}
      onClick={() => {
        navigator.clipboard
          .writeText(buildShareUrl({ contest: contestId }))
          .then(() => toast.success(labels.linkCopied))
          .catch(() => undefined);
      }}
    />
  </div>
);

/**
 * The toast after a contest is saved from the dialog. A public contest gets a
 * Copy link button: it can be shared right away.
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

  // Long enough to reach the button (toasts close after 2s by default).
  toast.success(
    <SavedToastBody
      message={message}
      contestId={contest._id}
      labels={labels}
    />,
    { autoClose: 6000 },
  );
};
