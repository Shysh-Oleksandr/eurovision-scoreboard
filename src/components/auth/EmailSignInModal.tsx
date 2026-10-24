'use client';

import { Mail, MailCheck, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import {
  clearPendingEmailSignIn,
  loadPendingEmailSignIn,
  savePendingEmailSignIn,
} from './emailSignInPending';

import {
  type EmailSignInError,
  looksLikeEmail,
  parseEmailSignInError,
  requestEmailCode,
} from '@/api/emailSignIn';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { Input } from '@/components/Input';
import { useEmailSignInStore } from '@/state/emailSignInStore';
import { useAuthStore } from '@/state/useAuthStore';

const CODE_LENGTH = 6;

type Step = 'email' | 'code';

const linkButtonClass =
  'font-semibold underline underline-offset-2 text-white/85 hover:text-white transition-colors disabled:no-underline disabled:text-white/45 disabled:cursor-default';

/**
 * Passwordless sign-in (docs/email-sign-in.md): an email address, then the
 * 6-digit code we email to it. Signs in or creates the account in one go.
 * Opened by "Continue with email" in `SignInButtons`, over any modal.
 */
const EmailSignInModal: React.FC = () => {
  const t = useTranslations('widgets.profile.emailSignIn');
  const tProfile = useTranslations('widgets.profile');
  const locale = useLocale();
  const isOpen = useEmailSignInStore((s) => s.isOpen);
  const close = useEmailSignInStore((s) => s.close);
  const loginWithEmailCode = useAuthStore((s) => s.loginWithEmailCode);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Reopening within the code's lifetime resumes at the code step.
  useEffect(() => {
    if (!isOpen) return;
    const pending = loadPendingEmailSignIn();

    setError(null);
    setNotice(null);
    setCode('');
    if (pending) {
      setEmail(pending.email);
      setResendAt(pending.resendAt);
      setStep('code');
    } else {
      setStep('email');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    // After the modal's open transition has mounted the content.
    const id = window.setTimeout(() => {
      (step === 'email' ? emailRef : codeRef).current?.focus();
    }, 80);

    return () => window.clearTimeout(id);
  }, [isOpen, step]);

  // Ticks the resend countdown.
  useEffect(() => {
    if (!isOpen || step !== 'code' || resendAt <= Date.now()) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(id);
  }, [isOpen, step, resendAt]);

  const describe = useCallback(
    (e: EmailSignInError): string => {
      if (e.kind === 'tooManyRequests' && e.retryAfter) {
        return t('errors.tooManyRequestsWait', {
          minutes: Math.max(1, Math.ceil(e.retryAfter / 60)),
        });
      }
      if (e.kind === 'invalidCode' && e.attemptsLeft !== undefined) {
        return t('errors.invalidCodeTriesLeft', { count: e.attemptsLeft });
      }

      return t(`errors.${e.kind}`);
    },
    [t],
  );

  const sendCode = async (isResend: boolean) => {
    const address = email.trim();

    if (!looksLikeEmail(address)) {
      setError(t('errors.invalidEmail'));
      emailRef.current?.focus();

      return;
    }
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      const sent = await requestEmailCode(address, locale);
      const sentAt = Date.now();
      const nextResendAt = sentAt + sent.resendAfter * 1000;

      savePendingEmailSignIn({
        email: address,
        resendAt: nextResendAt,
        expiresAt: sentAt + sent.expiresIn * 1000,
      });
      setEmail(address);
      setResendAt(nextResendAt);
      setNow(sentAt);
      setCode('');
      setStep('code');
      if (isResend) {
        setNotice(t('codeResent'));
        codeRef.current?.focus();
      }
    } catch (e) {
      setError(describe(parseEmailSignInError(e)));
    } finally {
      setIsBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (isBusy || value.length !== CODE_LENGTH) return;
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      const success = await loginWithEmailCode(email, value, locale);

      if (!success) {
        setError(t('errors.unknown'));

        return;
      }
      clearPendingEmailSignIn();
      toast.success(tProfile('success'));
      close();
    } catch (e) {
      const parsed = parseEmailSignInError(e);

      setError(describe(parsed));
      setCode('');
      // The server dropped the code: a new one can be requested right away.
      if (parsed.kind === 'codeExpired' || parsed.kind === 'tooManyAttempts') {
        clearPendingEmailSignIn();
        setResendAt(0);
      }
      codeRef.current?.focus();
    } finally {
      setIsBusy(false);
    }
  };

  const onCodeChange = (raw: string) => {
    // Autofill and paste may bring spaces or dashes.
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);

    setCode(digits);
    if (digits.length === CODE_LENGTH) void verify(digits);
  };

  const changeEmail = () => {
    clearPendingEmailSignIn();
    setError(null);
    setNotice(null);
    setCode('');
    setStep('email');
  };

  const secondsToResend = Math.max(0, Math.ceil((resendAt - now) / 1000));

  return (
    <Modal
      isOpen={isOpen}
      onClose={isBusy ? undefined : close}
      // Above every modal that shows the sign-in buttons (reports sit at 1110).
      overlayClassName="!z-[1120]"
      containerClassName="!w-[min(100%,440px)]"
      withBlur
      bottomContent={
        <ModalBottomContent
          onClose={close}
          onSave={() => (step === 'email' ? sendCode(false) : verify(code))}
          isSaving={isBusy}
          saveButtonText={step === 'email' ? t('sendCode') : t('signIn')}
          saveButtonIcon={
            step === 'email' ? <Send className="size-[18px]" /> : undefined
          }
          saveButtonDisabled={step === 'code' && code.length !== CODE_LENGTH}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex-none flex items-center justify-center size-11 rounded-full bg-white/10 text-white">
            {step === 'email' ? (
              <Mail className="size-5" />
            ) : (
              <MailCheck className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-tight">
              {step === 'email' ? t('title') : t('codeTitle')}
            </h3>
            <p className="text-white/70 text-sm mt-1 leading-relaxed break-words">
              {step === 'email'
                ? t('emailBody')
                : t.rich('codeBody', {
                    email,
                    b: (chunks) => (
                      <strong className="text-white font-semibold">
                        {chunks}
                      </strong>
                    ),
                  })}
            </p>
          </div>
        </div>

        {step === 'email' ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode(false);
            }}
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="email-sign-in-email"
              className="text-white font-medium text-sm"
            >
              {t('emailLabel')}
            </label>
            <Input
              ref={emailRef}
              id="email-sign-in-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={254}
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              // Not `disabled`: that drops focus, closing the phone keyboard.
              readOnly={isBusy}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'email-sign-in-error' : undefined}
              className="h-12"
            />
          </form>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void verify(code);
            }}
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="email-sign-in-code"
              className="text-white font-medium text-sm"
            >
              {t('codeLabel')}
            </label>
            <input
              ref={codeRef}
              id="email-sign-in-code"
              name="one-time-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              enterKeyHint="go"
              maxLength={CODE_LENGTH + 4}
              placeholder="••••••"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              readOnly={isBusy}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'email-sign-in-error' : undefined}
              className="w-full h-14 rounded-[10px] bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 border-solid border-transparent border-b-2 hover:bg-primary-800 focus:bg-primary-800 focus:border-white transition-colors duration-300 text-white text-center text-[26px] font-bold tabular-nums tracking-[0.45em] pl-[0.45em] placeholder:text-white/30"
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => void sendCode(true)}
                disabled={isBusy || secondsToResend > 0}
              >
                {secondsToResend > 0
                  ? t('resendIn', { seconds: secondsToResend })
                  : t('resend')}
              </button>
              <button
                type="button"
                className={linkButtonClass}
                onClick={changeEmail}
                disabled={isBusy}
              >
                {t('changeEmail')}
              </button>
            </div>
            <p className="text-white/55 text-xs leading-relaxed">
              {t('spamHint')}
            </p>
          </form>
        )}

        {error && (
          <p
            id="email-sign-in-error"
            role="alert"
            className="text-red-300 text-sm leading-relaxed"
          >
            {error}
          </p>
        )}
        {notice && !error && (
          <p role="status" className="text-emerald-300 text-sm">
            {notice}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default EmailSignInModal;
