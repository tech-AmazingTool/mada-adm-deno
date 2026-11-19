import { formatRgb, parse } from "culori";

export function tailwindCssColorVarToRgb(token: string): string {
  const oklch = getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${token}`)
    .trim();

  return formatRgb(parse(oklch));
}
