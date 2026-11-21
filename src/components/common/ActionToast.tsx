import Button from '@/components/common/Button';

/**
 * A toast that asks for one decision: a message, the action (CTA) and a
 * quiet button that puts it off. The live-update notices and the apps'
 * What's new toast use it; it's the only toast with a CTA (DESIGN.md
 * "Toasts"), so it stays until answered.
 */
export function ActionToast({
  message,
  action,
  later,
  onAction,
  onLater,
}: {
  message: string;
  action: string;
  later: string;
  onAction: () => void;
  onLater: () => void;
}) {
  return (
    <div className="dp-toast-decide">
      <p className="text-balance">{message}</p>
      <div className="flex gap-1.5">
        <Button size="sm" variant="cta" label={action} onClick={onAction} />
        <Button
          size="sm"
          variant="surface"
          className="dp-act--quiet !text-[13px] !font-bold !text-white/70 hover:!text-white"
          label={later}
          onClick={onLater}
        />
      </div>
    </div>
  );
}
