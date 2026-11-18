import process from "node:process";

import { colors } from "@cliffy/ansi/colors";

import {
  ADM_LEVEL_ENTRIES_COUNT_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  type AdmLevelCode,
} from "@scope/consts/models";

const ESC = "\x1b[";
const MAX_LOG_HISTORY = 500;
const PERCENTAGE_FIELD_WIDTH = 5;
const FIXED_RESERVED_WIDTH = 2 + 1 + PERCENTAGE_FIELD_WIDTH; // '[' + ']' + ' ' + percentage

interface Layout {
  columns: number;
  rows: number;
  logTop: number;
  logBottom: number;
  logRows: number;
  separatorRow: number;
  processingLabelRow: number;
  processingBarRow: number;
  insertLabelRow: number;
  insertBarRow: number;
}

/**
 * Truncates a string containing ANSI escape codes to a maximum visible width,
 * ensuring color sequences are not sliced midway and are safely terminated.
 *
 * @param str - The string to truncate.
 * @param maxWidth - The maximum visible character width.
 * @returns The truncated ANSI string.
 */
function truncateAnsi(str: string, maxWidth: number): string {
  let visible = 0;
  let result = "";
  let i = 0;

  while (i < str.length) {
    if (str[i] === "\x1b" && str[i + 1] === "[") {
      let j = i + 2;
      while (j < str.length && !/[a-zA-Z]/.test(str[j])) {
        j++;
      }
      if (j < str.length) {
        result += str.slice(i, j + 1);
        i = j + 1;
        continue;
      }
    }

    if (visible < maxWidth) {
      result += str[i];
      visible++;
    } else {
      break;
    }
    i++;
  }

  return result + "\x1b[0m";
}

/**
 * Type of progress bar to update in the progress renderer.
 */
export type ProgressBarType = "processing" | "insert" | "process";

/**
 * Coordinates and renders interactive administrative data integration progress
 * and rolling log messages per administrative level in an alternate terminal screen buffer.
 */
export class AdmIntegrationProgressRenderer {
  #isRunning = false;
  #totalCount = 0;
  #admLevelTitle = "";
  #processingCount = 0;
  #insertCount = 0;
  #logHistory: string[] = [];

  #onResizeBound: (() => void) | null = null;
  #onSignalBound: (() => void) | null = null;
  #onExitBound: (() => void) | null = null;

  /**
   * Returns whether the interactive rendering session is currently active.
   */
  get isRunning(): boolean {
    return this.#isRunning;
  }

  /**
   * Starts or updates a rendering session for the given administrative level code.
   *
   * @param admLevelCode - The administrative level code being processed.
   */
  start(admLevelCode: AdmLevelCode): void {
    this.#totalCount = ADM_LEVEL_ENTRIES_COUNT_BY_CODE.get(admLevelCode) ?? 0;
    this.#admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode) ?? "";
    this.#processingCount = 0;
    this.#insertCount = 0;
    this.#logHistory = [];

    if (!this.#isRunning) {
      if (!process.stdout.isTTY) {
        this.#isRunning = true;
        return;
      }

      this.#isRunning = true;

      // Enter alternate screen and hide cursor
      this.#writeTerminal(`${ESC}?1049h${ESC}?25l`);
      this.#setupListeners();
    }

    this.#renderEntireScreen();
  }

  /**
   * Updates the progress bar count for either processing or insertion.
   *
   * @param type - Which progress bar to update ("processing" or "insert").
   * @param count - The current completed item count.
   */
  updateProgressBar(type: ProgressBarType, count: number): void {
    if (type === "processing" || type === "process") {
      this.#processingCount = count;
    } else if (type === "insert") {
      this.#insertCount = count;
    }

    if (!this.#isRunning || !process.stdout.isTTY) {
      return;
    }

    const layout = this.#getLayout();
    if (layout.rows < 8 || layout.columns < 20) {
      return;
    }

    this.#writeTerminal(this.#renderProgressBars(layout));
  }

  /**
   * Appends log lines to the scrollable log history and updates the TUI display.
   *
   * @param lines - An array of log line strings to display.
   */
  updateLogs(lines: string[]): void {
    if (lines.length === 0) {
      return;
    }

    const flatLines = lines.flatMap((line) => line.split(/\r?\n/));
    for (const line of flatLines) {
      this.#logHistory.push(line);
      if (this.#logHistory.length > MAX_LOG_HISTORY) {
        this.#logHistory.shift();
      }
    }

    if (!this.#isRunning || !process.stdout.isTTY) {
      return;
    }

    const layout = this.#getLayout();
    if (layout.logRows === 0 || layout.rows < 8 || layout.columns < 20) {
      return;
    }

    let output = "";
    for (const line of flatLines) {
      output += `${ESC}1S` +
        `${ESC}${layout.logBottom};1H` +
        `${ESC}2K` +
        truncateAnsi(line, layout.columns);
    }

    this.#writeTerminal(output);
  }

  /**
   * Stops the interactive rendering session, restores terminal screen buffer and cursor state,
   * and cleans up all active listeners.
   */
  stop(): void {
    if (!this.#isRunning) {
      return;
    }
    this.#isRunning = false;

    if (this.#onResizeBound) {
      process.stdout.off("resize", this.#onResizeBound);
      this.#onResizeBound = null;
    }
    if (this.#onSignalBound) {
      process.off("SIGINT", this.#onSignalBound);
      process.off("SIGTERM", this.#onSignalBound);
      this.#onSignalBound = null;
    }
    if (this.#onExitBound) {
      process.off("exit", this.#onExitBound);
      this.#onExitBound = null;
    }

    if (process.stdout.isTTY) {
      this.#writeTerminal(`${ESC}r${ESC}?25h${ESC}?1049l`);
    }
  }

  #getLayout(): Layout {
    const columns = process.stdout.columns ?? 80;
    const rows = process.stdout.rows ?? 24;

    const logTop = 3;
    const logBottom = Math.max(logTop, rows - 5);
    const logRows = Math.max(0, logBottom - logTop + 1);

    return {
      columns,
      rows,
      logTop,
      logBottom,
      logRows,
      separatorRow: rows - 4,
      processingLabelRow: rows - 3,
      processingBarRow: rows - 2,
      insertLabelRow: rows - 1,
      insertBarRow: rows,
    };
  }

  #writeTerminal(data: string): void {
    process.stdout.write(data);
  }

  #renderEntireScreen(): void {
    if (!process.stdout.isTTY) {
      return;
    }

    const layout = this.#getLayout();

    // Reset scrolling margins before rebuilding the screen
    let output = `${ESC}r${ESC}2J${ESC}H`;

    if (layout.rows < 8 || layout.columns < 20) {
      output += `${ESC}1;1HTerminal too small. Please resize it.`;
      this.#writeTerminal(output);
      return;
    }

    // Draw the fixed header
    output += this.#renderHeader(layout);

    // Draw the current log history
    output += this.#renderLogs(layout);

    // Draw bottom separator
    output += `${ESC}${layout.separatorRow};1H${ESC}2K${
      colors.gray("-".repeat(layout.columns))
    }`;

    // Draw the two fixed progress bars
    output += this.#renderProgressBars(layout);

    // Restrict scrolling to the log region
    output += `${ESC}${layout.logTop};${layout.logBottom}r`;

    // Keep the cursor at the bottom of the log region
    output += `${ESC}${layout.logBottom};1H`;

    this.#writeTerminal(output);
  }

  #renderHeader(layout: Layout): string {
    const title =
      `Integration of ${this.#totalCount.toLocaleString()} ${this.#admLevelTitle}s:`;
    const separator = colors.gray("-".repeat(layout.columns));

    return [
      `${ESC}1;1H${ESC}2K${truncateAnsi(title, layout.columns)}`,
      `${ESC}2;1H${ESC}2K${separator}`,
    ].join("");
  }

  #renderLogs(layout: Layout): string {
    const visibleLogs = this.#logHistory.slice(-layout.logRows);
    const lines: string[] = [];

    for (let i = 0; i < layout.logRows; i++) {
      const row = layout.logTop + i;
      const message = visibleLogs[i] ?? "";
      lines.push(
        `${ESC}${row};1H${ESC}2K${truncateAnsi(message, layout.columns)}`,
      );
    }

    return lines.join("");
  }

  #makeProgressBarLines(
    action: "Processed" | "Inserted",
    count: number,
    total: number,
    columns: number,
    colorFn: (str: string) => string,
  ): { label: string; bar: string } {
    const label =
      `${action} ${count.toLocaleString()} / ${total.toLocaleString()}`;

    const barWidth = Math.max(0, columns - FIXED_RESERVED_WIDTH);
    const actualCount = Math.min(count, total);
    const percentage = total > 0 ? Math.floor((actualCount / total) * 100) : 0;

    const filledWidth = barWidth > 0
      ? Math.floor((percentage / 100) * barWidth)
      : 0;
    const emptyWidth = Math.max(0, barWidth - filledWidth);

    const bar = colorFn("█".repeat(filledWidth)) +
      colors.gray("░".repeat(emptyWidth));
    const percentageStr = `${percentage}%`.padStart(
      PERCENTAGE_FIELD_WIDTH,
      " ",
    );
    const barLine = `[${bar}] ${percentageStr}`;

    return {
      label: truncateAnsi(colorFn(label), columns),
      bar: barLine,
    };
  }

  #renderProgressBars(layout: Layout): string {
    const pLines = this.#makeProgressBarLines(
      "Processed",
      this.#processingCount,
      this.#totalCount,
      layout.columns,
      colors.magenta,
    );
    const iLines = this.#makeProgressBarLines(
      "Inserted",
      this.#insertCount,
      this.#totalCount,
      layout.columns,
      colors.blue,
    );

    return [
      `${ESC}${layout.processingLabelRow};1H${ESC}2K${pLines.label}`,
      `${ESC}${layout.processingBarRow};1H${ESC}2K${pLines.bar}`,
      `${ESC}${layout.insertLabelRow};1H${ESC}2K${iLines.label}`,
      `${ESC}${layout.insertBarRow};1H${ESC}2K${iLines.bar}`,
      `${ESC}${layout.logBottom};1H`,
    ].join("");
  }

  #setupListeners(): void {
    this.#onResizeBound = () => {
      if (this.#isRunning) {
        this.#renderEntireScreen();
      }
    };
    process.stdout.on("resize", this.#onResizeBound);

    this.#onSignalBound = () => {
      this.stop();
      process.exit(0);
    };
    process.on("SIGINT", this.#onSignalBound);
    process.on("SIGTERM", this.#onSignalBound);

    this.#onExitBound = () => {
      if (process.stdout.isTTY) {
        this.#writeTerminal(`${ESC}r${ESC}?25h${ESC}?1049l`);
      }
    };
    process.on("exit", this.#onExitBound);
  }
}

let _instance: AdmIntegrationProgressRenderer | null = null;

/**
 * Injects or retrieves the singleton instance of {@linkcode AdmIntegrationProgressRenderer}.
 *
 * @returns The singleton progress renderer instance.
 */
export function injectAdmIntegrationProgressRenderer(): AdmIntegrationProgressRenderer {
  if (!_instance) {
    _instance = new AdmIntegrationProgressRenderer();
  }
  return _instance;
}

/**
 * Resets the singleton instance of {@linkcode AdmIntegrationProgressRenderer}, stopping any active session.
 */
export function resetAdmIntegrationProgressRenderer(): void {
  if (_instance) {
    _instance.stop();
    _instance = null;
  }
}

/**
 * Instantiates an object that holds the internal variables used by the progress rendering session.
 *
 * @returns A progress renderer session object.
 */
export function createAdmIntegrationProgressRenderer(): AdmIntegrationProgressRenderer {
  return injectAdmIntegrationProgressRenderer();
}
