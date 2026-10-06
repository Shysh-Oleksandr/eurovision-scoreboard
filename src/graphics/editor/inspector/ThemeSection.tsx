'use client';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { DesignTheme } from '../../model/design';
import {
  designThemeFromActive,
  designThemeLabel,
  sameDesignTheme,
  toCustomThemeSnapshot,
} from '../../model/designTheme';
import { useEditorStore } from '../editorStore';
import { Field, Hint, OptionGroup, SelectInput } from '../ui/controls';

import { useMyThemesListQuery } from '@/api/themes';
import Button from '@/components/common/Button';
import { JESC_THEME_OPTIONS, THEME_OPTIONS } from '@/data/data';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme } from '@/types/customTheme';

const yearValue = (year: string) => `year:${year}`;
const customValue = (id: string) => `custom:${id}`;
const themeValue = (theme: DesignTheme) =>
  theme.kind === 'year' ? yearValue(theme.year) : customValue(theme.theme._id);

/**
 * "Theme" (canvas): the theme the design renders in — a built-in year or one
 * of the user's custom themes — saved with the document so it keeps this
 * look whatever theme the app switches to. The option list is built-in
 * years, the user's themes and, when needed, the theme the design already
 * carries (a remix of someone else's, or the active one while signed out).
 */
const ThemeSection: React.FC = () => {
  const t = useTranslations('graphics.inspector.theme');
  const theme = useEditorStore((s) => s.design.theme);
  const setTheme = useEditorStore((s) => s.setTheme);
  const themeYear = useGeneralStore((s) => s.themeYear);
  const activeCustom = useGeneralStore((s) => s.customTheme);
  const user = useAuthStore((s) => s.user);
  const mine = useMyThemesListQuery({ limit: 50, enabled: !!user });

  const active = useMemo(
    () => designThemeFromActive({ themeYear, customTheme: activeCustom }),
    [themeYear, activeCustom],
  );
  const current = theme ?? active;

  const customThemes = useMemo(() => {
    const list: CustomTheme[] = [...(mine.data?.themes ?? [])];

    if (activeCustom && !list.some((x) => x._id === activeCustom._id))
      list.unshift(activeCustom);
    if (
      current.kind === 'custom' &&
      !list.some((x) => x._id === current.theme._id)
    )
      list.unshift(current.theme as unknown as CustomTheme);

    return list;
  }, [mine.data, activeCustom, current]);

  const groups: OptionGroup<string>[] = [
    ...(customThemes.length
      ? [
          {
            label: t('myThemes'),
            options: customThemes.map((x) => ({
              value: customValue(x._id),
              label: x.name,
            })),
          },
        ]
      : []),
    {
      label: 'ESC',
      options: THEME_OPTIONS.map((o) => ({
        value: yearValue(o.value),
        label: o.label,
      })),
    },
    {
      label: 'JESC',
      options: JESC_THEME_OPTIONS.map((o) => ({
        value: yearValue(o.value),
        label: o.label,
      })),
    },
  ];

  const pick = (value: string) => {
    if (value.startsWith('year:')) {
      setTheme({ kind: 'year', year: value.slice(5) });

      return;
    }
    const id = value.slice(7);
    const found = customThemes.find((x) => x._id === id);

    if (found) {
      setTheme({
        kind: 'custom',
        theme: toCustomThemeSnapshot(found) as unknown as Extract<
          DesignTheme,
          { kind: 'custom' }
        >['theme'],
      });
    }
  };

  return (
    <>
      <Field label={t('theme')}>
        <SelectInput<string>
          value={themeValue(current)}
          groups={groups}
          onChange={pick}
          ariaLabel={t('theme')}
        />
      </Field>
      {!sameDesignTheme(current, active) && (
        <Button
          variant="surface"
          size="sm"
          className="w-full justify-center"
          Icon={<RotateCcw className="size-[14px]" />}
          onClick={() => setTheme(active)}
        >
          {t('useAppTheme', { name: designThemeLabel(active) })}
        </Button>
      )}
      <Hint icon>{t('savedWithDesign')}</Hint>
    </>
  );
};

export default ThemeSection;
