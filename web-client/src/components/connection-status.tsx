"use client";

import { useRouter } from "next/navigation";
import { useSystemBridgeWS } from "./hooks/use-system-bridge-ws";
import { ErrorAlert } from "./ui/error-alert";
import { Button } from "~/components/ui/button";

export function ConnectionStatus() {
  const { error, isConnected, retryConnection } = useSystemBridgeWS();
  const router = useRouter();

  function handleRetry() {
    retryConnection();
  }

  function handleGoToSettings() {
    router.push("/connection");
  }

  if (!error) return null;

  const isTokenError =
    error.includes("Invalid API token") || error.includes("BAD_TOKEN");
  const isConnectionError = !isConnected && error;

  return (
    <div className="mb-4">
      <ErrorAlert
        error={error}
        onRetry={isConnectionError && !isTokenError ? handleRetry : undefined}
        isRetrying={false}
      />
      {isTokenError && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Authentication Required
              </h4>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Your API token is invalid or has expired. Please update your
                connection settings with a valid token.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToSettings}
              className="border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200 dark:hover:bg-amber-800"
            >
              Update Connection Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
