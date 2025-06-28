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

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Connection Error
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          {onRetry && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                disabled={isRetrying}
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
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
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
