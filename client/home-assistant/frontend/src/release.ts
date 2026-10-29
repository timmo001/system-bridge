/**
 * The oldest Home Assistant release the strategies support. 2026.10 has the
 * frontend's strategy `registryDependencies` and the System Bridge entities
 * the pages are built from.
 */
export const MINIMUM_RELEASE = "2026.10";

/**
 * Entities, by translation key, that Core adds after the minimum release, with
 * the release that adds them. They're only used once Home Assistant is at that
 * release. Entities named by their device class have no translation key, so
 * they go by the key in their unique ID instead.
 */
export const RELEASE_GATES = new Map([
  // Core #188678
  ["disk_device_read_rate", "2026.11"],
  ["disk_device_write_rate", "2026.11"],
  ["disk_read_rate", "2026.11"],
  ["disk_write_rate", "2026.11"],
  // Core #188569
  ["load_average", "2026.11"],
  ["load_average_5", "2026.11"],
  ["load_average_15", "2026.11"],
  // Core #188555
  ["network_download_rate", "2026.11"],
  ["network_upload_rate", "2026.11"],
  ["network_interface_download_rate", "2026.11"],
  ["network_interface_upload_rate", "2026.11"],
  ["network_interface_ssid", "2026.11"],
  ["network_interface_signal_strength", "2026.11"],
  ["network_interface_link_rate", "2026.11"],
  // Core #188564
  ["ac_connected", "2026.11"],
  ["battery_info", "2026.11"],
  ["battery_info_state", "2026.11"],
  ["battery_power", "2026.11"],
  ["battery_state", "2026.11"],
  ["battery_voltage", "2026.11"],
  // Core #189338
  ["display_brightness", "2026.12"],
  ["display_power", "2026.12"],
  // Core #189319
  ["gpu_decoder_usage_percentage", "2026.12"],
  ["gpu_encoder_usage_percentage", "2026.12"],
  ["gpu_fan_speed_percentage", "2026.12"],
  ["gpu_memory_total", "2026.12"],
  ["gpu_performance_state", "2026.12"],
  ["gpu_power_limit", "2026.12"],
  // Core #189326
  ["swap_used", "2026.12"],
  ["swap_used_percentage", "2026.12"],
  // Core #189331
  ["idle_time", "2026.12"],
  ["locked", "2026.12"],
  // Core #189489
  ["power_hibernate", "2026.12"],
  ["power_lock", "2026.12"],
  ["power_logout", "2026.12"],
  ["power_restart", "2026.12"],
  ["power_shutdown", "2026.12"],
  ["power_sleep", "2026.12"],
  // Core #189509, full media player
  ["audio", "2026.12"],
  ["audio_input", "2026.12"],
  ["audio_input_mute", "2026.12"],
  ["audio_input_volume", "2026.12"],
  ["audio_output", "2026.12"],
]);

/** The year and month of a version, such as `2026.11.0b2` or `2026.11.0.dev0`. */
const yearMonth = (version: string) => {
  const [year = 0, month = 0] = version
    .split(".")
    .map((part) => Number.parseInt(part, 10));

  return year * 100 + month;
};

/**
 * Whether Home Assistant's version is at least a release. Betas and
 * development builds count as their release.
 */
export const isAtLeast = (version: string, release: string) =>
  yearMonth(version) >= yearMonth(release);
