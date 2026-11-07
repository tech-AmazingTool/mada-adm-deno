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

executor.run((_context, batch) => {
  return batch.map((msg) => ({
    ...msg,
    inserted: true,
  }));
});
