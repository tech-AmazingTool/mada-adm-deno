/// <reference lib="deno.worker" />
import { injectRedisQueueWorkerExecutor } from "../redis-queue.workers-mediator.ts";

interface TestMessage {
  id: string;
}

interface ProcessedPayload extends TestMessage {
  processed: boolean;
}

const executor = injectRedisQueueWorkerExecutor<
  unknown,
  TestMessage,
  ProcessedPayload
>();

executor.run({
  init(_context, _meta, log) {
    log("[Process Worker] init");
  },
  execute(_context, batch, _extra, log) {
    log("[Process Worker] execute");
    return batch.map((msg) => ({
      ...msg,
      processed: true,
    }));
  },
  teardown(_context, _meta, log) {
    log("[Process Worker] teardown");
  },
});
