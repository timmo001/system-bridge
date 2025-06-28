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
        <div className="mt-2">
          <Button
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            onClick={handleGoToSettings}
          >
            Go to connection settings →
          </Button>
        </div>
      )}
    </div>
  );
}
