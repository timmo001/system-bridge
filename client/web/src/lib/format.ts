const locale = navigator.language;

const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

const compact = new Intl.NumberFormat(locale, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

/** A size in bytes, in binary units, such as "1.5 GB". */
export const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return "-";
  }

  if (bytes === 0) return "0 B";

  const index = Math.min(
    units.length - 1,
    Math.max(0, Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024))),
  );

  return `${decimal.format(bytes / 1024 ** index)} ${units[index]}`;
};

/** A rate in bytes per second, such as "2.3 MB/s". */
export const formatRate = (bytesPerSecond: number | null | undefined) =>
  bytesPerSecond === null || bytesPerSecond === undefined
    ? "-"
    : `${formatBytes(bytesPerSecond)}/s`;

/** A percentage from 0 to 100, such as "42%". */
export const formatPercent = (
  percent: number | null | undefined,
  digits = 0,
): string =>
  percent === null || percent === undefined || !Number.isFinite(percent)
    ? "-"
    : `${percent.toFixed(digits)}%`;

/** A number, rounded to one decimal place. */
export const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? "-" : decimal.format(value);

/** A large count, such as "1.2M". */
export const formatCount = (value: number | null | undefined): string =>
  value === null || value === undefined ? "-" : compact.format(value);

const plurals = new Intl.PluralRules(locale);

/** A count of things, such as "1 disk" or "3 disks". */
export const formatQuantity = (
  count: number,
  one: string,
  other = `${one}s`,
): string =>
  `${whole.format(count)} ${plurals.select(count) === "one" ? one : other}`;

/** A frequency in MHz, such as "3.6 GHz". */
export const formatFrequency = (mhz: number | null | undefined): string => {
  if (mhz === null || mhz === undefined) return "-";

  return mhz >= 1000
    ? `${decimal.format(mhz / 1000)} GHz`
    : `${whole.format(mhz)} MHz`;
};

export const formatTemperature = (celsius: number | null | undefined) =>
  celsius === null || celsius === undefined
    ? "-"
    : `${decimal.format(celsius)} °C`;

export const formatWatts = (watts: number | null | undefined) =>
  watts === null || watts === undefined ? "-" : `${decimal.format(watts)} W`;

/** A media position or length, such as "3:45" or "1:02:30". */
export const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}`
    : `${minutes}:${secs}`;
};

/** A long span of time, such as "3d 4h" or "12m". */
export const formatUptime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return "-";

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;

  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
};

const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

const relativeUnits: readonly (readonly [
  Intl.RelativeTimeFormatUnit,
  number,
])[] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1000],
];

/** How long ago a time was, such as "3 minutes ago". */
export const formatAgo = (millis: number): string => {
  const elapsed = millis - Date.now();
  const unit = relativeUnits.find(([, size]) => Math.abs(elapsed) >= size);

  return unit === undefined
    ? relative.format(0, "second")
    : relative.format(Math.round(elapsed / unit[1]), unit[0]);
};

const dateTime = new Intl.DateTimeFormat(locale, {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatDateTime = (millis: number): string =>
  dateTime.format(millis);
