import React from 'react';
import { toast } from 'react-toastify';

import { TriangleAlertIcon } from '../../assets/icons/TriangleAlertIcon';
import Button from '../common/Button';

const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-6 text-white">
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
            {/* Error Message */}
            <h3 className="text-primary-300 text-sm font-medium mb-2">
              Error:
            </h3>
            <div className="bg-primary-900/60 rounded-lg flex items-center justify-between border border-primary-700/40 p-5 mb-6">
              <p className="text-sm font-mono text-red-300 break-words">
                {error.message || 'Unknown error occurred'}
              </p>

              <Button
                variant="tertiary"
                onClick={() => {
                  navigator.clipboard.writeText(error.message);
                }}
              >
                Copy
              </Button>
            </div>

            {/* Info Section */}
            <div className="space-y-4 mb-8">
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
                  Your saved profile data and cloud-synced information won't be
                  affected
                </p>
              </div>
              <div className="flex items-start gap-3 text-primary-200">
                <div className="mt-0.5 text-primary-400">•</div>
                <p className="text-sm leading-relaxed">
                  If this problem persists, please report it to the developer at{' '}
                  <a
                    href="mailto:sasha.shysh23@gmail.com"
                    className="underline"
                  >
                    sasha.shysh23@gmail.com
                  </a>{' '}
                  with the error message.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                onClick={resetErrorBoundary}
                className="!px-8 !py-3 text-base font-semibold bg-primary-700 hover:bg-primary-600 border border-primary-600/50 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
  );
};

export default ErrorFallback;
