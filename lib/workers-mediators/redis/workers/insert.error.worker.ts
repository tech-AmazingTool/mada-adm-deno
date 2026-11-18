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
  { alwaysFail?: boolean },
  ProcessedPayload,
  InsertedPayload
>();

executor.run({
  execute() {
    throw new Error("Simulated insert worker error on first run");
  },
});
