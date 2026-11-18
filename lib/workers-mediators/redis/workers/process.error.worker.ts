/// <reference lib="deno.worker" />
import { injectRedisQueueWorkerExecutor } from "../redis-queue.workers-mediator.ts";

interface TestMessage {
  id: string;
}

interface ProcessedPayload extends TestMessage {
  processed: boolean;
}

const executor = injectRedisQueueWorkerExecutor<
  { alwaysFail?: boolean },
  TestMessage,
  ProcessedPayload
>();

executor.run({
  execute() {
    throw new Error("Simulated processing worker error on first run");
  },
});
