import {
  AlertCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  LightbulbIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

export type CalloutProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: "info" | "warning" | "success" | "error";
};

export function Callout({
  className,
  type = "info",
  children,
  ...props
}: CalloutProps) {
  const icons = {
    info: InfoIcon,
    warning: AlertTriangleIcon,
    success: LightbulbIcon,
    error: AlertCircleIcon,
  };

  const Icon = icons[type];

  const borderColors = {
    info: "border-l-blue-600 dark:border-l-blue-600",
    warning: "border-l-yellow-700 dark:border-l-yellow-600",
    success: "border-l-green-600 dark:border-l-green-500",
    error: "border-l-red-600 dark:border-l-red-500",
  };

  const iconColors = {
    info: "text-blue-600 dark:text-blue-400",
    warning: "text-yellow-700 dark:text-yellow-400",
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
  };

  const backgroundColors = {
    info: "bg-blue-50/50 dark:bg-blue-950/30",
    warning: "bg-yellow-50/50 dark:bg-yellow-950/30",
    success: "bg-green-50/50 dark:bg-green-950/30",
    error: "bg-red-50/50 dark:bg-red-950/30",
  };

  const alertTitle = {
    info: "Note",
    warning: "Warning",
    success: "Tip",
    error: "Caution",
  };

  return (
    <div
      className={cn(
        "relative my-4 overflow-hidden rounded-md",
        backgroundColors[type],
        className,
      )}
      {...props}
    >
      <div className="flex items-start">
        {/* Left colored border */}
        <div className={cn("w-1 self-stretch", borderColors[type])} />

        {/* Content area with icon and text */}
        <div className="flex flex-grow gap-3 px-4 py-3">
          <div className="mt-0.5 flex-shrink-0">
            <Icon className={cn("h-5 w-5", iconColors[type])} />
          </div>
          <div className="flex-1 text-sm">
            <p className="mt-0 mb-1 font-semibold text-gray-900 dark:text-gray-100">
              {alertTitle[type]}
            </p>
            <div className="text-gray-700 dark:text-gray-300 [&>p]:mt-0 [&>p]:mb-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
