/**
 * What the Android app's shell gives the web client when it runs inside it.
 * Every default is on unless it's turned off here.
 */
import { defineMobileConfig } from "@timmo001/groundwork-mobile";

export default defineMobileConfig({
  labels: { notifications: "System Bridge" },
});
