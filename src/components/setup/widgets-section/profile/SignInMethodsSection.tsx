import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';

import {
  connectProvider,
  errorKey,
  parseSignInMethodError,
  removeSignInMethod,
  type SignInMethod,
  type SignInMethods,
  type SignInProvider,
  useSignInMethodsQuery,
} from '@/api/signInMethods';
import AppleIcon from '@/assets/icons/AppleIcon';
import GoogleIcon from '@/assets/icons/GoogleIcon';
import Button from '@/components/common/Button';
import { useConfirmation } from '@/hooks/useConfirmation';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { nativePlatform } from '@/native/platform';
import { openEmailLink } from '@/state/emailSignInStore';
import { useAuthStore } from '@/state/useAuthStore';

interface Row {
  method: SignInMethod;
  label: string;
  icon: React.ReactNode;
  /** The connected account's address; null when not connected. */
  detail: string | null;
  connected: boolean;
}

const iconClass = 'size-5 flex-none';

/**
 * Edit profile → Sign-in methods (docs/sign-in-methods.md): which of Google,
 * Apple and email codes open this account, with Connect / Add / Change /
 * Remove. The last method can't be removed. Apple isn't offered in the
 * Android app (no Sign in with Apple there), but an Apple ID already
 * connected still shows, so it can be removed.
 */
const SignInMethodsSection: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const t = useTranslations('widgets.profile.signInMethods');
  const isSignedIn = useAuthStore((s) => !!s.user);
  const { data, isLoading, isError, refetch } = useSignInMethodsQuery(
    isOpen && isSignedIn,
  );
  const { confirm } = useConfirmation();
  const [busy, setBusy] = useState<SignInMethod | null>(null);

  const showError = (error: unknown, method: SignInMethod) => {
    toast.error(t(errorKey(parseSignInMethodError(error), method)));
  };

  const connect = async (provider: SignInProvider) => {
    setBusy(provider);
    try {
      // The website leaves for the provider here and lands back with a toast.
      const methods = await connectProvider(provider);

      if (methods) toast.success(t(`${provider}Connected`));
    } catch (error) {
      showError(error, provider);
    } finally {
      setBusy(null);
    }
  };

  const remove = (row: Row, methods: SignInMethods) => {
    const name = row.method === 'email' ? row.detail ?? '' : row.label;
    // A Google / Apple account with the account's own address keeps opening
    // it through that address, and signing in connects it again.
    const sharedEmail =
      row.method !== 'email' &&
      !!row.detail &&
      row.detail === methods.email?.address;
    const description =
      row.method === 'email'
        ? t('removeEmailDescription', { email: name })
        : sharedEmail
        ? t('removeSharedEmailDescription', {
            method: name,
            email: row.detail ?? '',
          })
        : t('removeDescription', { method: name });

    confirm({
      key: 'remove-sign-in-method',
      type: 'danger',
      title: t('removeTitle'),
      description,
      onConfirm: async () => {
        setBusy(row.method);
        try {
          await removeSignInMethod(row.method);
          if (row.method === 'email') {
            void useAuthStore
              .getState()
              .fetchMe()
              .catch(() => undefined);
          }
          toast.success(t('removed'));
        } catch (error) {
          showError(error, row.method);
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const header = (
    <div>
      <h4 className="text-lg font-bold">{t('title')}</h4>
      <p className="text-white/60 text-sm leading-snug">{t('description')}</p>
    </div>
  );

  if (!data) {
    return (
      <section className="mt-6 pt-5 border-t border-white/10 space-y-4">
        {header}
        {isError && !isLoading ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-white/70 text-sm">{t('loadFailed')}</p>
            <Button variant="tertiary" size="md" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : (
          <div className="flex justify-center py-3" aria-busy="true">
            <span className="loader small" />
          </div>
        )}
      </section>
    );
  }

  const rows: Row[] = [
    {
      method: 'google',
      label: t('google'),
      icon: <GoogleIcon className={iconClass} />,
      detail: data.google ? data.google.email ?? t('connected') : null,
      connected: !!data.google,
    },
    {
      method: 'apple',
      label: t('apple'),
      icon: <AppleIcon className={iconClass} />,
      detail: data.apple ? data.apple.email ?? t('connected') : null,
      connected: !!data.apple,
    },
    {
      method: 'email',
      label: t('email'),
      icon: <Mail className={iconClass} />,
      detail: data.email?.address ?? null,
      connected: !!data.email,
    },
  ];
  const visibleRows = rows.filter(
    (row) =>
      row.method !== 'apple' || row.connected || nativePlatform() !== 'android',
  );
  const connectedCount = rows.filter((row) => row.connected).length;

  const actionsFor = (row: Row) => {
    const actions: React.ReactNode[] = [];

    if (row.method === 'email') {
      actions.push(
        <Button
          key="email"
          variant="tertiary"
          size="md"
          disabled={!!busy}
          onClick={openEmailLink}
        >
          {row.connected ? t('change') : t('add')}
        </Button>,
      );
    } else if (!row.connected) {
      actions.push(
        <Button
          key="connect"
          variant="tertiary"
          size="md"
          disabled={!!busy}
          isLoading={busy === row.method}
          onClick={() => void connect(row.method as SignInProvider)}
        >
          {t('connect')}
        </Button>,
      );
    }
    if (row.connected && connectedCount > 1) {
      actions.push(
        <Button
          key="remove"
          variant="tertiary"
          size="md"
          disabled={!!busy}
          isLoading={busy === row.method}
          onClick={() => remove(row, data)}
        >
          {t('remove')}
        </Button>,
      );
    }

    return actions;
  };

  return (
    <section className="mt-6 pt-5 border-t border-white/10 space-y-4">
      {header}
      <MethodList
        rows={visibleRows}
        actionsFor={actionsFor}
        notConnected={t('notConnected')}
      />
    </section>
  );
};

/** Actions beside the methods while every address fits, else under them. */
const LIST_STEPS = [{ layout: 'inline' }, { layout: 'stack' }] as const;

const MethodList: React.FC<{
  rows: Row[];
  actionsFor: (row: Row) => React.ReactNode[];
  notConnected: string;
}> = ({ rows, actionsFor, notConnected }) => {
  const listRef = useRef<HTMLUListElement>(null);
  const step = useFitStep(listRef, LIST_STEPS, {
    targets: '.dp-signin-detail',
  });

  return (
    <ul
      ref={listRef}
      className="dp-signin-list space-y-3"
      {...fitStepAttributes(LIST_STEPS[step])}
    >
      {rows.map((row) => {
        const actions = actionsFor(row);

        return (
          <li key={row.method} className="dp-signin-row">
            <span className="dp-signin-icon flex">{row.icon}</span>
            <div className="dp-signin-text">
              <div className="font-semibold">{row.label}</div>
              <div
                className="dp-signin-detail text-white/60 text-sm leading-snug truncate"
                title={row.detail ?? undefined}
              >
                {row.detail ?? notConnected}
              </div>
            </div>
            {actions.length > 0 && (
              <div className="dp-signin-actions">{actions}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default SignInMethodsSection;
