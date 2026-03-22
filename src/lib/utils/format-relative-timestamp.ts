export function formatRelativeTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  if (diffInSeconds === 0) {
    return "now";
  }

  if (Math.abs(diffInSeconds) < 60) {
    return "just now";
  }

  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(diffInSeconds) >= secondsPerUnit || unit === "second") {
      const delta =
        diffInSeconds > 0
          ? Math.floor(diffInSeconds / secondsPerUnit)
          : Math.ceil(diffInSeconds / secondsPerUnit);
      return rtf.format(delta, unit);
    }
  }

  return value;
}
