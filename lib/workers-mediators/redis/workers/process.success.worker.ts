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

executor.run((_context, batch) => {
  return batch.map((msg) => ({
    ...msg,
    processed: true,
  }));
});
