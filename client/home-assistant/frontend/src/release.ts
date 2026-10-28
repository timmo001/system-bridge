/**
 * The oldest Home Assistant release the strategies support. 2026.10 has the
 * frontend's strategy `registryDependencies` and the System Bridge entities
 * the pages are built from.
 */
export const MINIMUM_RELEASE = "2026.10";

/**
 * Entities, by translation key, that Core adds after the minimum release, with
 * the release that adds them. They're only used once Home Assistant is at that
 * release.
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
