/**
 * Calculates the next untitled location number based on existing pinned locations.
 * Scans all existing pinned locations matching the `Untitled location <num>` pattern,
 * finds the smallest missing positive integer (gap number starting from 1),
 * or the next increment after the highest number if no gaps exist.
 *
 * @param existingTitles - Array of titles of existing pinned locations.
 * @returns The next gap number to use for the untitled location.
 */
export function getNextUntitledLocationNumber(
  existingTitles: string[],
): number {
  const pattern = /^Untitled location (\d+)$/;
  const existingNumbers = new Set<number>();

  for (const title of existingTitles) {
    const match = pattern.exec(title.trim());
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        existingNumbers.add(num);
      }
    }
  }

  let nextNum = 1;
  while (existingNumbers.has(nextNum)) {
    nextNum++;
  }

  return nextNum;
}

/**
 * Generates the default title for the next untitled pinned location.
 *
 * @param existingTitles - Array of titles of existing pinned locations.
 * @returns The generated title string in the format `Untitled location <num>`.
 */
export function getNextUntitledLocationTitle(
  existingTitles: string[],
): string {
  const nextNum = getNextUntitledLocationNumber(existingTitles);
  return `Untitled location ${nextNum}`;
}
