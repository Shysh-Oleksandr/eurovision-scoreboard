'use client';

import isDeepEqual from 'fast-deep-equal';
import { useEffect, useMemo } from 'react';

import { useCreateErrorMutation } from '@/api/errors';
import { TriangleAlertIcon } from '@/assets/icons/TriangleAlertIcon';
import Button from '@/components/common/Button';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const USER_DETAILS = {
  platform: navigator.platform,
  userAgent: navigator.userAgent,
  language: navigator.language,
  screenWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
  screenHeight: typeof window !== 'undefined' ? window.innerHeight : undefined,
};

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const generalState = useGeneralStore((state) => state);
  const scoreboardState = useScoreboardStore((state) => state);
  const createErrorMutation = useCreateErrorMutation();

  // Generate a unique key for this error to track if it's been reported
  const errorKey = useMemo(() => {
    const message = error.message || 'Unknown error occurred';
    const stack = error.stack || '';

    // Create a stable key based on error message, and first line of stack
    const stackFirstLine = stack.split('\n')[0] || '';
    const keyContent = `${message}|${stackFirstLine}`;

    // Create a simple hash from the content
    let hash = 0;

    for (let i = 0; i < keyContent.length; i += 1) {
      const char = keyContent.charCodeAt(i);

      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `error_reported_${Math.abs(hash).toString(36)}`;
  }, [error.message, error.stack]);

  const isSameSettingsPointsSystem = isDeepEqual(
    generalState.pointsSystem,
    generalState.settingsPointsSystem,
  );
  const isDefaultPointsSystem = isDeepEqual(
    generalState.pointsSystem,
    PREDEFINED_SYSTEMS_MAP.default,
  );
  const generalInfo = {
    pointsSystem: isDefaultPointsSystem ? 'Default' : generalState.pointsSystem,
    settingsPointsSystem: isSameSettingsPointsSystem
      ? 'Same'
      : generalState.settingsPointsSystem,
    settings: generalState.settings,
    theme: generalState.customTheme || generalState.themeYear,
  };

  const scoreboardInfo = {
    currentStageId: scoreboardState.currentStageId,
    votingCountryIndex: scoreboardState.votingCountryIndex,
    votingPointsIndex: scoreboardState.votingPointsIndex,
    televotingProgress: scoreboardState.televotingProgress,
    startCounter: scoreboardState.startCounter,
    restartCounter: scoreboardState.restartCounter,
    eventStages: scoreboardState.eventStages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      votingMode: stage.votingMode,
      isOver: stage.isOver,
      isJuryVoting: stage.isJuryVoting,
      isLastStage: stage.isLastStage,
      qualifiersAmount: stage.qualifiersAmount,
      countries: stage.countries.map((country) => country.code),
      votingCountries: stage.votingCountries?.map((country) => country.code),
    })),
  };

  const messageToShare =
    (error.stack || error.message || 'Unknown error occurred') +
    '\n\n' +
    'User Details: ' +
    JSON.stringify(USER_DETAILS);

  // Silently report error to backend (for both authenticated and unauthenticated users)
  // Use localStorage to prevent duplicate reports on page refresh
  useEffect(() => {
    // Check if this error has already been reported
    const hasBeenReported = localStorage.getItem(errorKey);

    if (!hasBeenReported) {
      // Mark as reported before sending to prevent race conditions
      localStorage.setItem(errorKey, Date.now().toString());

      createErrorMutation.mutate({
        message: error.message || 'Unknown error occurred',
        stack: error.stack,
        userDetails: USER_DETAILS,
        generalInfo,
        scoreboardInfo,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorKey]);

  if (window.innerWidth < 768) {
    document.querySelector('#root')?.classList.add('!h-auto', '!overflow-auto');
    document.querySelector('html')?.classList.add('!h-auto', '!overflow-auto');
    document.querySelector('body')?.classList.add('!h-auto', '!overflow-auto');
  }

  return (
    <html data-theme="2022" suppressHydrationWarning>
      <body>
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-6 text-white overflow-y-auto">
          <div className="max-w-2xl w-full">
            {/* Error Card */}
            <div className="bg-primary-800/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 shadow-2xl overflow-hidden">
              {/* Header Section */}
              <div className="bg-gradient-to-br from-primary-700/40 to-primary-800/60 px-8 py-10 text-center border-b border-primary-700/30">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* Pulsing background circle */}
                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse blur-xl"></div>
                    {/* Icon container */}
                    <div className="relative bg-red-500/20 rounded-full p-6 border-2 border-red-500/50">
                      <TriangleAlertIcon className="w-16 h-16 text-red-400" />
                    </div>
                  </div>
                </div>

                <h1 className="text-3xl font-bold text-white mb-3">
                  Oops! Something Went Wrong
                </h1>
                <p className="text-primary-300 text-base">
                  We encountered an unexpected error
                </p>
              </div>

              {/* Error Details Section */}
              <div className="px-8 py-8">
                <div className="flex items-center justify-between mb-2">
                  {/* Error Message */}
                  <h3 className="text-primary-300 text-sm font-medium">
                    Error:
                  </h3>
                  <Button
                    variant="tertiary"
                    onClick={() => {
                      navigator.clipboard.writeText(messageToShare);
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <div className="bg-primary-900/60 rounded-lg flex items-center justify-between border border-primary-700/40 p-5 mb-6 max-h-[150px] overflow-auto">
                  <p className="text-sm font-mono text-red-300 break-words">
                    {error.message || 'Unknown error occurred'}
                  </p>
                </div>

                {/* Info Section */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3 text-primary-200">
                    <div className="mt-0.5 text-primary-400">•</div>
                    <p className="text-sm leading-relaxed">
                      Clicking "Reload Page" will reload the page keeping all
                      local data. Try it first.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 text-primary-200">
                    <div className="mt-0.5 text-primary-400">•</div>
                    <p className="text-sm leading-relaxed">
                      Clicking "Reset Application" will clear all local data and
                      reload the app
                    </p>
                  </div>
                  <div className="flex items-start gap-3 text-primary-200">
                    <div className="mt-0.5 text-primary-400">•</div>
                    <p className="text-sm leading-relaxed">
                      Your saved profile data and cloud-synced information won't
                      be affected
                    </p>
                  </div>
                  <div className="flex items-start gap-3 text-primary-200">
                    <div className="mt-0.5 text-primary-400">•</div>
                    <p className="text-sm leading-relaxed">
                      If this problem persists, please send an email to the
                      developer at{' '}
                      <a
                        href={`mailto:sasha.shysh23@gmail.com?subject=Error Report&body=${messageToShare}`}
                        className="underline"
                      >
                        sasha.shysh23@gmail.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex justify-center items-center gap-4">
                  <Button
                    onClick={() => window.location.reload()}
                    className="!px-8 !py-3 text-base font-semibold bg-primary-700 hover:bg-primary-600 border border-primary-600/50 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105"
                  >
                    Reload Page
                  </Button>
                  <Button
                    onClick={() => {
                      reset();
                      window.location.reload();
                      localStorage.clear();
                    }}
                    variant="destructive"
                    className="!px-8 !py-3 text-base font-semibold bg-primary-700 hover:bg-primary-600 border border-primary-600/50 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105"
                  >
                    Reset Application
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-primary-900/40 px-8 py-4 border-t border-primary-700/30">
                <p className="text-xs text-center text-primary-400">
                  Error ID: {Date.now().toString(36).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
