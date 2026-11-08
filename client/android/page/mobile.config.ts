/**
 * The Android shell's config. The build writes it to the app's assets as
 * JSON for the shell, and the pairing page and the web client read it too.
 * Every default is on; the notification channel is named for the app.
 */
import { defineMobileConfig } from "@timmo001/groundwork-mobile";

export default defineMobileConfig({
  labels: { notifications: "System Bridge" },
});
