import { assertEquals } from "@std/assert";

import { AdmLevelCode } from "@scope/consts/models";

import {
  createAdmIntegrationProgressRenderer,
  injectAdmIntegrationProgressRenderer,
  resetAdmIntegrationProgressRenderer,
} from "./render-adm-integration-progress.helper.ts";

Deno.test("AdmIntegrationProgressRenderer", async (t) => {
  await t.step("singleton instantiation pattern works", () => {
    resetAdmIntegrationProgressRenderer();
    const r1 = injectAdmIntegrationProgressRenderer();
    const r2 = injectAdmIntegrationProgressRenderer();
    const r3 = createAdmIntegrationProgressRenderer();

    assertEquals(r1, r2);
    assertEquals(r1, r3);
    resetAdmIntegrationProgressRenderer();
  });

  await t.step(
    "start initializes state, logs update history, and stop resets session",
    () => {
      resetAdmIntegrationProgressRenderer();
      const renderer = injectAdmIntegrationProgressRenderer();

      assertEquals(renderer.isRunning, false);

      renderer.start(AdmLevelCode.PROVINCE);
      assertEquals(renderer.isRunning, true);

      renderer.updateProgressBar("processing", 3);
      renderer.updateProgressBar("insert", 2);

      renderer.updateLogs(["Log line 1", "Log line 2\nLog line 3"]);

      renderer.stop();
      assertEquals(renderer.isRunning, false);

      // Calling stop again is idempotent
      renderer.stop();
      assertEquals(renderer.isRunning, false);

      resetAdmIntegrationProgressRenderer();
    },
  );
});
