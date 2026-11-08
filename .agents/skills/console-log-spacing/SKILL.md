---
name: console-log-spacing
description: Rules for spacing console output in TypeScript programs. Use whenever writing or editing TS/JS code that prints to the console (console.log, console.info, etc.) and needs blank lines between messages, including conditional or branching output. Make sure to apply this even if the user only says "add a log", "print a message", or "leave a gap between outputs".
---

# Console log spacing

## Core rule

Never start a string with `\n`. Put extra spacing at the **end** of the string.

```ts
// Bad
console.log("\nStarting build...");

// Good
console.log("Starting build...\n");
```

## Conditional spacing

If a log is followed by output that only renders under some condition, do **not** add `\n` to that log. The blank line belongs after the whole block, not after any single conditional piece.

1. Identify every log in the block (the unconditional ones and the conditional ones).
2. Find where the block ends: the last place any of those conditional logs could render.
3. Add a single bare `console.log()` there, after the conditional section has finished.

```ts
// Bad: the \n is stuck to a log that may or may not be the last one
console.log("Results:");
if (errors.length) console.log(`${errors.length} errors\n`);
if (warnings.length) console.log(`${warnings.length} warnings\n`);

// Good: one blank line closes the entire block
console.log("Results:");
if (errors.length) console.log(`${errors.length} errors`);
if (warnings.length) console.log(`${warnings.length} warnings`);
console.log();
```

## Checklist

- No string literal or template literal begins with `\n`.
- `\n` appears only at the end of a string whose following spacing is unconditional.
- Conditional blocks end with a plain `console.log()`, never a trailing `\n` on one of their members.
- No double spacing (two blank lines) unless explicitly asked for. Don't assume an existing double `\n` is necessarily wrong, though: it may be intentional, so leave it alone unless the user asks to change it.
