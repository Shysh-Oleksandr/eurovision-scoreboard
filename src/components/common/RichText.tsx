import { useLocale } from 'next-intl';
import { type ReactNode, useMemo } from 'react';
import { createTranslator } from 'use-intl';

export type RichTextComponents = {
  list: (chunks: ReactNode) => ReactNode;
  item: (chunks: ReactNode) => ReactNode;
  strong: (chunks: ReactNode) => ReactNode;
};

export const RICH_TEXT_COMPONENTS: RichTextComponents = {
  list: (chunks: ReactNode) => (
    <ul className="list-disc list-inside space-y-1 text-white/80">{chunks}</ul>
  ),
  item: (chunks: ReactNode) => <li>{chunks}</li>,
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-white">{chunks}</strong>
  ),
};

export const GUIDE_RICH_TEXT_COMPONENTS: RichTextComponents = {
  ...RICH_TEXT_COMPONENTS,
  list: (chunks: ReactNode) => (
    <ul className="list-disc list-inside mt-2 space-y-1.5 text-white/80">
      {chunks}
    </ul>
  ),
};

type RichTextProps = {
  content: string;
  className?: string;
  components?: RichTextComponents;
};

export const RichText = ({
  content,
  className,
  components = RICH_TEXT_COMPONENTS,
}: RichTextProps) => {
  const locale = useLocale();
  const rendered = useMemo(() => {
    const t = createTranslator({ locale, messages: { content } });

    return t.rich('content', components);
  }, [locale, content, components]);

  if (className) {
    return <div className={className}>{rendered}</div>;
  }

  return <>{rendered}</>;
};
