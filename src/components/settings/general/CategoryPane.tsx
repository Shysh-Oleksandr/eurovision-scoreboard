import { useTranslations } from 'next-intl';
import React from 'react';

import { ItemNode } from './ItemRenderer';
import { Category, SettingsEnv } from './model/types';

interface CategoryPaneProps {
  category: Category;
  env: SettingsEnv;
}

export const CategoryPane: React.FC<CategoryPaneProps> = ({
  category,
  env,
}) => {
  const t = useTranslations();

  return (
    <div className="st2-pane-fade min-w-0">
      <div className="px-3">
        <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-white">
          {t(category.titleKey)}
        </h3>
        <p className="mt-1 text-[13px] text-white/50">{t(category.blurbKey)}</p>
      </div>
      <div className="mt-3 flex flex-col gap-0.5">
        {category.items.map((item) => (
          <ItemNode key={item.id} item={item} env={env} />
        ))}
      </div>
    </div>
  );
};
