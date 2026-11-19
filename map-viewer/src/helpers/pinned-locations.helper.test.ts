import { assertEquals } from "@std/assert";
import {
  getNextUntitledLocationNumber,
  getNextUntitledLocationTitle,
} from "./untitled-location.helper.ts";

Deno.test("getNextUntitledLocationNumber returns 1 when there are no existing titles", () => {
  assertEquals(getNextUntitledLocationNumber([]), 1);
  assertEquals(
    getNextUntitledLocationNumber(["My Location", "Antananarivo"]),
    1,
  );
});

Deno.test("getNextUntitledLocationNumber returns 1 when existing numbers start above 1", () => {
  assertEquals(
    getNextUntitledLocationNumber([
      "Untitled location 4",
      "Untitled location 7",
    ]),
    1,
  );
});

Deno.test("getNextUntitledLocationNumber picks the smallest gap when sequence misses numbers", () => {
  assertEquals(
    getNextUntitledLocationNumber([
      "Untitled location 1",
      "Untitled location 2",
      "Untitled location 3",
      "Untitled location 4",
      "Untitled location 7",
    ]),
    5,
  );
});

Deno.test("getNextUntitledLocationNumber returns next incremented last number when there are no gaps", () => {
  assertEquals(
    getNextUntitledLocationNumber([
      "Untitled location 1",
      "Untitled location 2",
      "Untitled location 3",
    ]),
    4,
  );
});

Deno.test("getNextUntitledLocationTitle generates the correct title", () => {
  assertEquals(
    getNextUntitledLocationTitle([]),
    "Untitled location 1",
  );
  assertEquals(
    getNextUntitledLocationTitle([
      "Untitled location 1",
      "Untitled location 2",
    ]),
    "Untitled location 3",
  );
});
