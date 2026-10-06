'use client';
import {
  Bookmark,
  BookmarkCheck,
  Flag,
  LayoutTemplate,
  Link2,
  MoreHorizontal,
  Rows3,
  Share2,
  Table2,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { parseDesign } from '../model/design';

import DesignThumb from './DesignThumb';

import {
  useDeleteDesignMutation,
  useDesignsStateQuery,
  useToggleLikeDesignMutation,
  useToggleSaveDesignMutation,
} from '@/api/designs';
import { useReportsStateQuery } from '@/api/reports';
import AnchoredMenu, {
  AnchoredMenuEntry,
} from '@/components/common/AnchoredMenu';
import Button from '@/components/common/Button';
import UserInfo from '@/components/common/UserInfo';
import { useHandleShare } from '@/components/setup/hooks/useHandleShare';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useAuthStore } from '@/state/useAuthStore';
import type { CloudDesign } from '@/types/design';

/**
 * Community template cards (gallery Templates/Saved tabs, profile content
 * feeds) with like / save / report / unpublish, and the grid that wires
 * them to the per-user state queries.
 */

const designLink = (id: string) =>
  `${window.location.href.split('?')[0]}?design=${id}`;

export const CommunityCard: React.FC<{
  record: CloudDesign;
  liked: boolean;
  saved: boolean;
  reported?: boolean;
  onUse: () => void;
  onLike: () => void;
  onSave: () => void;
  onReport?: () => void;
  onDelete?: () => void;
}> = ({
  record,
  liked,
  saved,
  reported,
  onUse,
  onLike,
  onSave,
  onReport,
  onDelete,
}) => {
  const t = useTranslations('graphics.gallery');
  const handleShare = useHandleShare();
  const user = useAuthStore((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const mine = !!user && record.userId === user._id;
  const design = useMemo(() => {
    try {
      return parseDesign(record.design);
    } catch {
      return null;
    }
  }, [record.design]);
  const items: AnchoredMenuEntry[] = [
    {
      label: t('useTemplate'),
      icon: <LayoutTemplate className="size-4" />,
      onClick: onUse,
    },
    {
      label: t('copyLink'),
      icon: <Link2 className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(designLink(record._id));
        toast.success(t('toast.linkCopied'));
      },
    },
    {
      label: t('share'),
      icon: <Share2 className="size-4" />,
      onClick: () => handleShare('design', record._id, record.name),
    },
    ...(!mine && onReport
      ? ([
          'hr',
          {
            label: reported ? t('reported') : t('report'),
            icon: <Flag className="size-4" />,
            disabled: reported,
            onClick: onReport,
          },
        ] as AnchoredMenuEntry[])
      : []),
    ...(mine && onDelete
      ? ([
          'hr',
          {
            label: t('unpublish'),
            icon: <Trash2 className="size-4" />,
            variant: 'danger',
            onClick: onDelete,
          },
        ] as AnchoredMenuEntry[])
      : []),
  ];

  return (
    <article className="gfx-gcard is-community">
      <button
        type="button"
        className="gfx-gthumb-btn"
        aria-label={`${t('useTemplate')}: ${record.name}`}
        onClick={onUse}
      >
        <div className="gfx-gthumb">
          {record.thumbnailUrl ? (
            <img
              className="gfx-gthumb-img"
              src={record.thumbnailUrl}
              alt=""
              loading="lazy"
            />
          ) : design ? (
            <DesignThumb design={design} width={252} height={150} />
          ) : null}
        </div>
      </button>
      <div className="gfx-gbody">
        <div className="gfx-gtitle-row">
          <h3>{record.name}</h3>
          <button
            ref={anchorRef}
            type="button"
            className="gfx-iconbtn gfx-iconbtn--sm"
            aria-label={t('more')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="size-[16px]" />
          </button>
          <AnchoredMenu
            open={menuOpen}
            anchor={anchorRef.current}
            onClose={() => setMenuOpen(false)}
            items={items}
            placement="bottom-end"
          />
        </div>
        {record.description && (
          <p className="gfx-gdesc">{record.description}</p>
        )}
        <div className="gfx-gmeta">
          <span className="gfx-chip">
            {record.autoSize
              ? t('contentSized')
              : `${record.canvasWidth} × ${record.canvasHeight}`}
          </span>
          {record.hasScoreboard && (
            <span className="gfx-chip">
              <Rows3 className="size-[12px]" />
              {t('scoreboard')}
            </span>
          )}
          {record.hasStats && (
            <span className="gfx-chip">
              <Table2 className="size-[12px]" />
              {t('stats')}
            </span>
          )}
          {record.fieldsCount > 0 && (
            <span className="gfx-chip">
              {t('nFields', { count: record.fieldsCount })}
            </span>
          )}
          {!record.isPublic && (
            <span className="gfx-chip">{t('unlisted')}</span>
          )}
        </div>
        <div className="gfx-gby">
          <UserInfo user={record.creator} size="sm" />
          {record.remixedFromName && (
            <span className="gfx-remix" title={record.remixedFromName}>
              <Link2 className="size-3" />
              {t('remix')}
            </span>
          )}
        </div>
        <div className="gfx-gact">
          <Button
            variant="cta"
            size="md"
            className="flex-1 justify-center"
            onClick={onUse}
          >
            {t('useTemplate')}
          </Button>
          <button
            type="button"
            className={`gfx-cnt${liked ? ' is-on' : ''}`}
            aria-pressed={liked}
            aria-label={`${t('like')} · ${record.likes}`}
            title={t('like')}
            disabled={mine}
            onClick={onLike}
          >
            <ThumbsUp className="size-4" />
            <span>{record.likes}</span>
          </button>
          <button
            type="button"
            className={`gfx-cnt${saved ? ' is-on' : ''}`}
            aria-pressed={saved}
            aria-label={`${t('save')} · ${record.saves}`}
            title={t('save')}
            disabled={mine}
            onClick={onSave}
          >
            {saved ? (
              <BookmarkCheck className="size-4" />
            ) : (
              <Bookmark className="size-4" />
            )}
            <span>{record.saves}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

/* ---------------- cloud lists ---------------- */

export const useCommunityActions = () => {
  const t = useTranslations('graphics.gallery');
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: toggleLike } = useToggleLikeDesignMutation();
  const { mutateAsync: toggleSave } = useToggleSaveDesignMutation();
  const { mutateAsync: remove } = useDeleteDesignMutation();
  const { confirm } = useConfirmation();
  const guard = () => {
    if (user) return true;
    toast.info(t('signInToReact'));

    return false;
  };

  return {
    like: async (id: string) => {
      if (!guard()) return;
      try {
        await toggleLike(id);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || t('toast.failed'));
      }
    },
    save: async (id: string) => {
      if (!guard()) return;
      try {
        const res = await toggleSave(id);

        toast.success(res.saved ? t('toast.saved') : t('toast.unsaved'));
      } catch (err: any) {
        toast.error(err?.response?.data?.message || t('toast.failed'));
      }
    },
    unpublish: (record: CloudDesign) =>
      confirm({
        key: 'unpublish-graphics-design',
        title: t('unpublishTitle', { name: record.name }),
        description: t('unpublishBody'),
        type: 'danger',
        onConfirm: async () => {
          await remove(record._id);
          toast.success(t('toast.unpublished'));
        },
      }),
  };
};

export const CloudGrid: React.FC<{
  designs: CloudDesign[];
  onUse: (record: CloudDesign) => void;
  onReport: (record: CloudDesign) => void;
}> = ({ designs, onUse, onReport }) => {
  const user = useAuthStore((s) => s.user);
  const ids = useMemo(() => designs.map((d) => d._id), [designs]);
  const { data: state } = useDesignsStateQuery(ids, !!user);
  const { data: reports } = useReportsStateQuery('design', ids, !!user);
  const actions = useCommunityActions();

  return (
    <div className="gfx-ggrid">
      {designs.map((record) => (
        <CommunityCard
          key={record._id}
          record={record}
          liked={!!state?.likedIds.includes(record._id)}
          saved={!!state?.savedIds.includes(record._id)}
          reported={!!reports?.reportedIds.includes(record._id)}
          onUse={() => onUse(record)}
          onLike={() => actions.like(record._id)}
          onSave={() => actions.save(record._id)}
          onReport={user ? () => onReport(record) : undefined}
          onDelete={() => actions.unpublish(record)}
        />
      ))}
    </div>
  );
};
