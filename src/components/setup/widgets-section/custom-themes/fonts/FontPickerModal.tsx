'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import BuiltinFontsTab from './BuiltinFontsTab';
import { FontSelection } from './fontPickerTypes';
import MyFontsTab from './MyFontsTab';
import PublicFontsTab from './PublicFontsTab';
import UploadFontTab from './UploadFontTab';

import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import Tabs from '@/components/common/tabs/Tabs';

const PICKER_TABS = ['builtin', 'mine', 'public', 'upload'] as const;

type PickerTab = (typeof PICKER_TABS)[number];

interface FontPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `element` = one element of a graphics design (hint copy only). */
  slot: 'ui' | 'scoreboard' | 'element';
  value: FontSelection;
  onSelect: (selection: FontSelection) => void;
  /** Override the overlay layer (the graphics editor sits at 1005). */
  overlayClassName?: string;
}

const FontPickerModal: React.FC<FontPickerModalProps> = ({
  isOpen,
  onClose,
  slot,
  value,
  onSelect,
  overlayClassName = '!z-[1003]',
}) => {
  const t = useTranslations('widgets.themes.fonts');
  const [activeTab, setActiveTab] = useState<PickerTab>(
    value.kind === 'custom' ? 'mine' : 'builtin',
  );

  const tabs = useMemo(
    () => PICKER_TABS.map((tab) => ({ value: tab, label: t(`tabs.${tab}`) })),
    [t],
  );

  return (
    <Modal
      dataTheme="custom-preview"
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,820px)]"
      fullScreenOnPhone
      contentClassName="text-white sm:h-[72vh] h-[70vh] max-h-[72vh]"
      // Above the theme editor (1002) so it can be opened from inside it.
      overlayClassName={overlayClassName}
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as PickerTab)}
          containerClassName="!rounded-none"
        />
      }
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <div className="flex flex-col gap-3">
        <p className="text-white/60 text-xs">
          {slot === 'scoreboard'
            ? t('pickForScoreboard')
            : slot === 'element'
            ? t('pickForElement')
            : t('pickForUi')}
        </p>
        {activeTab === 'builtin' && (
          <BuiltinFontsTab value={value} onSelect={onSelect} />
        )}
        {activeTab === 'mine' && (
          <MyFontsTab
            value={value}
            onSelect={onSelect}
            onGoToUpload={() => setActiveTab('upload')}
          />
        )}
        {activeTab === 'public' && (
          <PublicFontsTab value={value} onSelect={onSelect} />
        )}
        {activeTab === 'upload' && <UploadFontTab onSelect={onSelect} />}
      </div>
    </Modal>
  );
};

export default FontPickerModal;
