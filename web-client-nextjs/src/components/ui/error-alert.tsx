"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorAlert({
  error,
  onDismiss,
  onRetry,
  isRetrying = false,
}: ErrorAlertProps) {
  if (!error) return null;

  // Check if this is a token-related error
  const isTokenError =
    error.includes("Invalid API token") || error.includes("BAD_TOKEN");

  // Use different styling for token errors vs general connection errors
  const containerClasses = isTokenError
    ? "rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
    : "rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950";

  const iconClasses = isTokenError
    ? "mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400"
    : "mt-0.5 h-5 w-5 text-red-600 dark:text-red-400";

  const titleClasses = isTokenError
    ? "text-sm font-medium text-amber-800 dark:text-amber-200"
    : "text-sm font-medium text-red-800 dark:text-red-200";

  const textClasses = isTokenError
    ? "mt-1 text-sm text-amber-700 dark:text-amber-300"
    : "mt-1 text-sm text-red-700 dark:text-red-300";

  const buttonClasses = isTokenError
    ? "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
    : "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900";

  const dismissClasses = isTokenError
    ? "h-8 w-8 p-0 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
    : "h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900";

  return (
    <div className={containerClasses}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={iconClasses} />
        <div className="flex-1">
          <h3 className={titleClasses}>
            {isTokenError ? "Authentication Error" : "Connection Error"}
          </h3>
          <p className={textClasses}>{error}</p>
          {onRetry && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                disabled={isRetrying}
                className={buttonClasses}
              >
                {isRetrying ? "Retrying..." : "Retry Connection"}
              </Button>
            </div>
          )}
        </div>
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className={dismissClasses}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
