/// <reference lib="deno.worker" />
import { injectRedisQueueWorkerExecutor } from "../redis-queue.workers-mediator.ts";

interface ProcessedPayload {
  id: string;
  processed: boolean;
}

interface InsertedPayload extends ProcessedPayload {
  inserted: boolean;
}

const executor = injectRedisQueueWorkerExecutor<
  unknown,
  ProcessedPayload,
  InsertedPayload
>();

executor.run({
  init(_context, _meta, log) {
    log("[Insert Worker] init");
  },
  execute(_context, batch, _extra, log) {
    log("[Insert Worker] execute");
    return batch.map((msg) => ({
      ...msg,
      inserted: true,
    }));
  },
  teardown(_context, _meta, log) {
    log("[Insert Worker] teardown");
  },
});
