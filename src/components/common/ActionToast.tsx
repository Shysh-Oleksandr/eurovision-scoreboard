import Button from '@/components/common/Button';

/**
 * A toast that asks for one decision: a message, the action (CTA) and a
 * button that puts it off. The live-update notices and the apps' What's new
 * toast use it.
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
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] font-semibold leading-5 text-balance">
        {message}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="cta" label={action} onClick={onAction} />
        <Button size="sm" variant="surface" label={later} onClick={onLater} />
      </div>
    </div>
  );
}
