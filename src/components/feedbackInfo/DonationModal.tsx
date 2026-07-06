import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-toastify';

import Modal from '../common/Modal/Modal';
import ModalBottomCloseButton from '../common/Modal/ModalBottomCloseButton';

const SEPA_DETAILS = {
  iban: 'LT853130010107400271',
  bic: 'BZENLT22',
  accountHolder: 'Oleksandr Shysh',
} as const;

type DonationDetailRowProps = {
  label: string;
  value: string;
  copyable?: boolean;
  copiedLabel: string;
};

const DonationDetailRow = ({
  label,
  value,
  copyable = true,
  copiedLabel,
}: DonationDetailRowProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(copiedLabel);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-[10px]">
      <div className="min-w-0">
        <p className="text-white/60 text-sm">{label}</p>
        <p className="font-semibold break-all">{value}</p>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className="flex-shrink-0 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-400" />
          ) : (
            <Copy className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  );
};

const DonationModal = ({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}) => {
  const t = useTranslations('feedbackInfo');
  const copiedLabel = t('copied');

  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      containerClassName="!w-[min(100%,560px)]"
      contentClassName="pb-2 !pt-5 xs:!px-8 !px-6 text-white narrow-scrollbar"
      overlayClassName="!z-[1002]"
      withBlur
      bottomContent={
        <ModalBottomCloseButton onClose={() => setShowModal(false)} />
      }
    >
      <div className="lg:text-lg sm:text-base text-base">
        <h2 className="text-xl font-bold mb-3">{t('donationModalTitle')}</h2>

        <p className="text-white/70 text-base leading-[1.70] mb-5">
          {t('donationModalIntro')}
        </p>

        <div className="border border-white/10 border-solid rounded-xl bg-primary-800/60 pt-[18px] px-5 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl leading-none">🇪🇺</span>
            <span className="font-bold">{t('donationModalSepaTitle')}</span>
          </div>

          <div className="divide-y divide-white/10">
            <DonationDetailRow
              label={t('donationModalIban')}
              value={SEPA_DETAILS.iban}
              copiedLabel={copiedLabel}
            />
            <DonationDetailRow
              label={t('donationModalBic')}
              value={SEPA_DETAILS.bic}
              copiedLabel={copiedLabel}
            />
            <DonationDetailRow
              label={t('donationModalAccountHolder')}
              value={SEPA_DETAILS.accountHolder}
              copiedLabel={copiedLabel}
            />
            <DonationDetailRow
              label={t('donationModalNote')}
              value={t('donationModalNoteValue')}
              copiedLabel={copiedLabel}
            />
          </div>
        </div>

        <p className="text-white/50 text-sm leading-[1.6] mt-4">
          {t('donationModalDisclaimer')}
        </p>

        <p className="text-base font-medium mt-4">
          {t('donationModalThankYou')}
        </p>
      </div>
    </Modal>
  );
};

export default DonationModal;
