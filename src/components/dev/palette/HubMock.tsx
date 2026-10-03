'use client';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CopyCheck,
  MessageSquareWarning,
  Palette,
  Pencil,
  Play,
  Save,
  Settings,
  Trophy,
  UserCheck,
} from 'lucide-react';
import React, { memo } from 'react';

import { InterfaceTokens, interfaceTokensToCssVars } from '@/theme/oklch';

/** Inline style that re-points a `.dp-palette-scope` at `tokens`. */
export const tokensStyle = (tokens: InterfaceTokens) =>
  interfaceTokensToCssVars(tokens) as unknown as React.CSSProperties;

// Literal class names: `dp-*` live under `@layer components` and are only
// emitted when they appear verbatim in the source.
const WIDGETS = [
  {
    tone: 'dp-tone-blue',
    icon: UserCheck,
    title: 'Profile',
    stat: '27 followers · 16 following',
  },
  {
    tone: 'dp-tone-pink',
    icon: Palette,
    title: 'Themes',
    stat: '18 custom · 25 saved',
  },
  {
    tone: 'dp-tone-gold',
    icon: Trophy,
    title: 'Contests',
    stat: '22 private · 4 public',
  },
];

const TILES = [
  { code: 'se', name: 'Sweden', selected: false },
  { code: 'fi', name: 'Finland', selected: true },
  { code: 'it', name: 'Italy', selected: false },
  { code: 'ua', name: 'Ukraine', selected: true },
  { code: 'no', name: 'Norway', selected: false },
  { code: 'at', name: 'Austria', selected: false },
];

type HubMockProps = {
  tokens: InterfaceTokens;
  backgroundImage?: string;
  /** CSS zoom of the 600px-wide mock. */
  zoom?: number;
};

/**
 * A static replica of the Event Setup hub built from the real `dp-*` classes,
 * scoped to its own interface tokens so many palettes can sit side by side.
 */
const HubMock = ({ tokens, backgroundImage, zoom = 0.6 }: HubMockProps) => (
  <div
    className="dp-palette-scope relative rounded-xl overflow-hidden flex-none"
    style={{
      ...tokensStyle(tokens),
      zoom,
      background: backgroundImage
        ? `center / cover no-repeat url(${backgroundImage})`
        : 'var(--p-950)',
    }}
  >
    <div className="p-6">
      <div className="dp-surface-modal w-[600px] rounded-2xl overflow-hidden text-white">
        <div className="p-4 flex flex-col gap-3.5">
          <div className="flex items-end gap-2.5">
            <div>
              <div className="text-[10.5px] font-extrabold tracking-[.09em] uppercase text-white/55 mb-1.5">
                Contest
              </div>
              <div className="dp-combo h-[46px] rounded-xl flex items-stretch overflow-hidden">
                <span className="px-3 flex items-center gap-2 text-[14.5px] font-extrabold">
                  <img
                    src="/flags/at.svg"
                    alt=""
                    className="w-6 h-[17px] rounded-[3px] object-cover"
                  />
                  2026
                  <ChevronDown className="size-4 text-white/40" />
                </span>
                <span className="dp-combo-chip is-on w-9 grid place-items-center">
                  <Trophy className="size-4" />
                </span>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <span className="dp-act dp-act--strong h-[46px] px-3.5 rounded-xl flex items-center gap-2 text-[13.5px] font-extrabold">
                <Settings className="size-[18px]" />
                Settings
              </span>
              <span className="dp-act dp-act--feedback dp-dot w-[46px] h-[46px] rounded-xl grid place-items-center">
                <MessageSquareWarning className="size-5" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {WIDGETS.map(({ tone, icon: Icon, title, stat }) => (
              <div
                key={title}
                className={`dp-widget ${tone} rounded-[14px] px-3 py-3 flex items-center gap-2.5 min-w-0`}
              >
                <span className="dp-widget-icon w-[38px] h-[38px] rounded-xl grid place-items-center flex-none">
                  <Icon className="size-[19px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold leading-tight">
                    {title}
                  </span>
                  <span className="dp-widget-stat block text-[10.5px] font-extrabold mt-[3px] truncate">
                    {stat}
                  </span>
                </span>
                <ChevronRight className="size-4 flex-none text-white/40" />
              </div>
            ))}
          </div>

          <div className="dp-contest-card relative rounded-[14px] px-4 py-[15px] mt-1 flex items-center gap-3">
            <span className="dp-badge-pill absolute -top-2.5 left-3.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full">
              Yours · Local
            </span>
            <img
              src="/flags/at.svg"
              alt=""
              className="w-8 h-6 rounded-sm object-cover flex-none"
            />
            <div className="min-w-0">
              <div className="text-[19px] font-extrabold tracking-[-.022em] leading-tight">
                Eurovision 2026
              </div>
              <div className="text-xs font-bold text-white/70 mt-0.5">
                35 participating · 3 stages
              </div>
            </div>
            <div className="ml-auto flex gap-[7px]">
              <span className="dp-act is-on h-10 px-3 rounded-xl flex items-center gap-2 text-[13px] font-extrabold">
                <CopyCheck className="size-[17px]" />
                Selecting
              </span>
              <span className="dp-act dp-act--strong h-10 px-3 rounded-xl flex items-center gap-2 text-[13px] font-extrabold">
                <Save className="size-[17px]" />
                Save
              </span>
            </div>
          </div>

          <div className="dp-stage rounded-[14px]">
            <div className="flex items-center gap-[11px] px-3.5 py-[13px]">
              <ChevronDown className="size-[19px] text-white/70" />
              <span className="w-[26px] h-[26px] rounded-lg grid place-items-center text-[11.5px] font-extrabold bg-white/10 border border-hair text-white/70">
                01
              </span>
              <span className="text-xl font-extrabold tracking-[-.024em]">
                Semi-Final 1
              </span>
              <span className="ml-auto dp-count-pill h-[34px] px-3 rounded-full flex items-center gap-1.5 text-[13px] font-extrabold">
                15
                <ChevronDown className="size-3.5" />
              </span>
              <span className="dp-icon-btn w-[34px] h-[34px] rounded-[9px] grid place-items-center">
                <Pencil className="size-4" />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-[7px] px-3.5 pb-3.5">
              {TILES.map(({ code, name, selected }) => (
                <span
                  key={code}
                  className={`dp-tile ${
                    selected ? 'is-selected' : ''
                  } flex items-center gap-[9px] px-[9px] py-2 rounded-[10px]`}
                >
                  {selected ? (
                    <span className="dp-check w-[17px] h-[17px] rounded-[5px] grid place-items-center flex-none">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  ) : (
                    <img
                      src={`/flags/${code}.svg`}
                      alt=""
                      className="w-6 h-[17px] rounded-[3px] object-cover flex-none"
                    />
                  )}
                  <span className="flex-1 text-[13px] font-bold truncate">
                    {name}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="dp-tray rounded-[14px] px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="text-[13px] font-extrabold">2 selected</span>
            <span className="dp-act h-[34px] px-3 rounded-[9px] flex items-center text-[12.5px] font-extrabold">
              Move to…
            </span>
            <span className="ml-auto dp-act dp-act--strong h-[34px] px-3 rounded-[9px] flex items-center text-[12.5px] font-extrabold">
              Done
            </span>
          </div>
        </div>

        <div className="dp-surface-footer px-4 py-2.5">
          <span className="dp-cta h-[50px] rounded-xl flex items-center justify-center gap-2.5 text-base font-extrabold">
            <Play className="size-[19px]" />
            Start
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default memo(HubMock);

type SwatchMockProps = {
  tokens: InterfaceTokens;
};

/** A thumbnail of the accent-bearing parts: both widget chips, a selected tile, the CTA. */
export const SwatchMock = memo(({ tokens }: SwatchMockProps) => (
  <span
    className="dp-palette-scope block p-2 rounded-t-lg"
    style={{ ...tokensStyle(tokens), background: 'var(--p-900)' }}
  >
    <span className="flex items-center gap-1.5 mb-1.5">
      <span className="dp-tone-blue dp-widget-icon w-6 h-6 rounded-md grid place-items-center flex-none">
        <UserCheck className="size-3.5" />
      </span>
      <span className="dp-tone-pink dp-widget-icon w-6 h-6 rounded-md grid place-items-center flex-none">
        <Palette className="size-3.5" />
      </span>
      <span className="dp-tile is-selected flex-1 min-w-0 h-6 rounded-md flex items-center gap-1 px-1">
        <span className="dp-check w-3 h-3 rounded-[3px] grid place-items-center flex-none">
          <Check className="size-2.5" strokeWidth={3} />
        </span>
        <span className="text-[9px] font-bold text-white truncate">
          Finland
        </span>
      </span>
    </span>
    <span className="dp-cta h-6 rounded-md flex items-center justify-center gap-1 text-[9.5px] font-extrabold">
      <Play className="size-2.5" />
      Start
    </span>
  </span>
));

SwatchMock.displayName = 'SwatchMock';
