/**
 * Notification/Toast utility
 *
 * Provides methods to show success and error messages.
 * Currently logs to console, will be replaced with actual toast UI component.
 */

export type NotificationType = "success" | "error" | "info" | "warning";

/**
 * Show a success notification
 *
 * @param message - The success message to display
 */
export function showSuccess(message: string): void {
  console.log(`[SUCCESS] ${message}`);
  // TODO: Replace with toast notification component
}

/**
 * Show an error notification
 *
 * @param message - The error message to display
 */
export function showError(message: string): void {
  console.error(`[ERROR] ${message}`);
  // TODO: Replace with toast notification component
}

/**
 * Show a notification with custom type
 *
 * @param title - The notification title
 * @param message - The notification message
 * @param type - The type of notification (success, error, info, warning)
 */
export function showNotification(
  title: string,
  message: string,
  type: NotificationType = "info",
): void {
  console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  // TODO: Replace with toast notification component
}
