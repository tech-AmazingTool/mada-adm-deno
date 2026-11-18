import { assertEquals, assertExists } from "@std/assert";
import { afterAll, beforeEach, describe, it } from "@std/testing/bdd";

import {
  injectRedisConnection,
  type RedisConnectionParams,
} from "@scope/redis";

import { RedisQueueWorkersMediator } from "./redis-queue.workers-mediator.ts";

function createWorkers(procFile: string, insFile: string) {
  const p1 = new Worker(import.meta.resolve(procFile), { type: "module" });
  const p2 = new Worker(import.meta.resolve(procFile), { type: "module" });
  const ins = new Worker(import.meta.resolve(insFile), { type: "module" });
  return {
    workers: {
      processing: [p1, p2],
      insert: ins,
    },
    terminate: () => {
      p1.terminate();
      p2.terminate();
      ins.terminate();
    },
  };
}

function createMessageStream(
  messages: Array<{ id: string }>,
): ReadableStream<{ id: string }> {
  return new ReadableStream({
    start(controller) {
      for (const msg of messages) {
        controller.enqueue(msg);
      }
      controller.close();
    },
  });
}

const redis = injectRedisConnection();

const clearTestData = async () => {
  const keys = [
    "test:processing:context",
    "test:insert:context",
    "test:processing:stream",
    "test:insert:stream",
    "test:processing:failed-ids",
    "test:insert:failed-ids",
    "test:persisted-last:message",
  ];
  await redis.client.sendCommand(["DEL", ...keys]);
  try {
    await redis.client.sendCommand([
      "XGROUP",
      "DESTROY",
      "test:processing:stream",
      "test:processing-group",
    ]);
  } catch (_) {
    // Ignore if group does not exist
  }
  try {
    await redis.client.sendCommand([
      "XGROUP",
      "DESTROY",
      "test:insert:stream",
      "test:insert-group",
    ]);
  } catch (_) {
    // Ignore if group does not exist
  }
};

const redisUrl = Deno.env.get("REDIS_URL");
const redisParams: RedisConnectionParams = redisUrl || {
  host: Deno.env.get("REDIS_HOST") ?? "localhost",
  port: Number(Deno.env.get("REDIS_PORT") ?? "6379"),
  username: Deno.env.get("REDIS_USERNAME") || undefined,
  password: Deno.env.get("REDIS_PASSWORD") || undefined,
  db: Deno.env.get("REDIS_DB") ? Number(Deno.env.get("REDIS_DB")) : undefined,
  ssl: Deno.env.get("REDIS_SSL") === "true" ||
    Deno.env.get("REDIS_SSL") === "1",
  certFile: Deno.env.get("REDIS_CERT_FILE") || undefined,
  certPath: Deno.env.get("REDIS_CERT_PATH") || undefined,
  keyFile: Deno.env.get("REDIS_KEY_FILE") || undefined,
  keyPath: Deno.env.get("REDIS_KEY_PATH") || undefined,
  caCertFile: Deno.env.get("REDIS_CA_CERT_FILE") || undefined,
  caCertPath: Deno.env.get("REDIS_CA_CERT_PATH") || undefined,
};

let isRedisConnected = false;
try {
  await redis.connect(redisParams);
  await redis.client.sendCommand(["PING"]);
  isRedisConnected = true;
} catch (err) {
  console.warn(
    `[Redis Integration Test] Redis server unreachable. Aborting test. Reason:`,
    err instanceof Error ? err.message : String(err),
  );
}

const testOptions = {
  processingContextKey: "test:processing:context",
  processingStreamKey: "test:processing:stream",
  processingFailedIdsKey: "test:processing:failed-ids",
  insertContextKey: "test:insert:context",
  insertStreamKey: "test:insert:stream",
  insertFailedIdsKey: "test:insert:failed-ids",
  processingConsumerGroupName: "test:processing-group",
  insertConsumerGroupName: "test:insert-group",
  persistedLastMessageKey: "test:persisted-last:message",
  xreadBlockDuration: 500,
};

describe("RedisQueueWorkersMediator Integration Tests", () => {
  beforeEach(async () => {
    if (isRedisConnected) {
      await clearTestData();
    }
  });

  afterAll(async () => {
    if (isRedisConnected) {
      await clearTestData();
      redis.close();
    }
  });

  it("Success case: streamed and queued messages completed at 100% without retry prompt", async () => {
    if (!isRedisConnected) return;

    const { workers, terminate } = createWorkers(
      "./workers/process.success.worker.ts",
      "./workers/insert.success.worker.ts",
    );

    try {
      let retryPromptCalled = false;
      const mediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: () => {
            retryPromptCalled = true;
            return false;
          },
        },
      );

      const messages = [
        { id: "msg-1" },
        { id: "msg-2" },
        { id: "msg-3" },
        { id: "msg-4" },
      ];
      const stream = createMessageStream(messages);

      const procFinished: unknown[] = [];
      const insFinished: unknown[] = [];
      const procProgressEvents: Array<{
        current: number;
        total: number;
        progress: number;
      }> = [];
      const insProgressEvents: Array<{
        current: number;
        total: number;
        progress: number;
      }> = [];

      await mediator.queue(
        { batchId: "success-run" },
        stream,
        workers,
        {
          totalCount: 4,
          batchSize: 2,
          maxRetries: 2,
          onProcessingFinished: (p) => {
            procFinished.push(...p);
          },
          onInsertFinished: (p) => {
            insFinished.push(...p);
          },
          onProcessingProgress: (pr) => {
            procProgressEvents.push(pr);
          },
          onInsertProgress: (pr) => {
            insProgressEvents.push(pr);
          },
        },
      );

      assertEquals(procFinished.length, 4);
      assertEquals(insFinished.length, 4);

      const lastProcProgress = procProgressEvents.at(-1);
      assertExists(lastProcProgress);
      assertEquals(lastProcProgress.current, 4);
      assertEquals(lastProcProgress.total, 4);
      assertEquals(lastProcProgress.progress, 1);

      const lastInsProgress = insProgressEvents.at(-1);
      assertExists(lastInsProgress);
      assertEquals(lastInsProgress.current, 4);
      assertEquals(lastInsProgress.total, 4);
      assertEquals(lastInsProgress.progress, 1);

      assertEquals(retryPromptCalled, false);
    } finally {
      terminate();
    }
  });

  it("Processing error case: processing worker errors, prompt returns true, then completes without second prompt", async () => {
    if (!isRedisConnected) return;

    const { workers, terminate } = createWorkers(
      "./workers/process.error.worker.ts",
      "./workers/insert.success.worker.ts",
    );

    try {
      let promptCallCount = 0;
      const mediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: (_ctx, pelCount) => {
            promptCallCount++;
            assertEquals(pelCount > 0, true);
            return false;
          },
        },
      );

      const messages = [{ id: "p-err-1" }, { id: "p-err-2" }];
      const stream = createMessageStream(messages);

      const procFinished: unknown[] = [];
      const insFinished: unknown[] = [];

      await mediator.queue(
        { batchId: "proc-err-run" },
        stream,
        workers,
        {
          totalCount: 2,
          batchSize: 2,
          maxRetries: 2,
          onProcessingFinished: (p) => {
            procFinished.push(...p);
          },
          onInsertFinished: (p) => {
            insFinished.push(...p);
          },
        },
      );

      assertEquals(promptCallCount, 1);
      assertEquals(procFinished.length, 0);
      assertEquals(insFinished.length, 0);
    } finally {
      terminate();
    }
  });

  it("Insert error case: insert worker errors, prompt returns true, then completes without second prompt", async () => {
    if (!isRedisConnected) return;

    const { workers, terminate } = createWorkers(
      "./workers/process.success.worker.ts",
      "./workers/insert.error.worker.ts",
    );

    try {
      let promptCallCount = 0;
      const mediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: (_ctx, pelCount) => {
            promptCallCount++;
            assertEquals(pelCount > 0, true);
            return false;
          },
        },
      );

      const messages = [{ id: "ins-err-1" }, { id: "ins-err-2" }];
      const stream = createMessageStream(messages);

      const procFinished: unknown[] = [];
      const insFinished: unknown[] = [];

      await mediator.queue(
        { batchId: "ins-err-run" },
        stream,
        workers,
        {
          totalCount: 2,
          batchSize: 1,
          maxRetries: 2,
          onProcessingFinished: (p) => {
            procFinished.push(...p);
          },
          onInsertFinished: (p) => {
            insFinished.push(...p);
          },
        },
      );

      assertEquals(promptCallCount, 1);
      assertEquals(procFinished.length, 2);
      assertEquals(insFinished.length, 0);
    } finally {
      terminate();
    }
  });

  it("Processing PEL recovery: processing error with prompt false, then manual restart with success workers recovers PEL", async () => {
    if (!isRedisConnected) return;

    const { workers: errWorkers, terminate: termErr } = createWorkers(
      "./workers/process.error.worker.ts",
      "./workers/insert.success.worker.ts",
    );

    try {
      let promptCalled = false;
      const failMediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: () => {
            promptCalled = true;
            return false;
          },
        },
      );

      const messages = [{ id: "proc-pel-1" }, { id: "proc-pel-2" }];
      await failMediator.queue(
        { alwaysFail: true, batchId: "pel-proc" },
        createMessageStream(messages),
        errWorkers,
        {
          totalCount: 2,
          batchSize: 1,
          maxRetries: 2,
        },
      );
      assertEquals(promptCalled, true);
    } finally {
      termErr();
    }

    const { workers: successWorkers, terminate: termSucc } = createWorkers(
      "./workers/process.success.worker.ts",
      "./workers/insert.success.worker.ts",
    );

    try {
      const succMediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: () => false,
        },
      );

      const procFinished: unknown[] = [];
      const insFinished: unknown[] = [];

      await succMediator.queue(
        { batchId: "pel-proc-recovered" },
        [{ id: "proc-pel-1" }, { id: "proc-pel-2" }],
        successWorkers,
        {
          totalCount: 2,
          batchSize: 2,
          maxRetries: 2,
          onProcessingFinished: (p) => {
            procFinished.push(...p);
          },
          onInsertFinished: (p) => {
            insFinished.push(...p);
          },
        },
      );

      assertEquals(procFinished.length, 2);
      assertEquals(insFinished.length, 2);
    } finally {
      termSucc();
    }
  });

  it("Insert PEL recovery: insert error with prompt false, then manual restart with success workers recovers PEL", async () => {
    if (!isRedisConnected) return;

    const { workers: errWorkers, terminate: termErr } = createWorkers(
      "./workers/process.success.worker.ts",
      "./workers/insert.error.worker.ts",
    );

    try {
      let promptCalled = false;
      const failMediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: () => {
            promptCalled = true;
            return false;
          },
        },
      );

      const messages = [{ id: "ins-pel-1" }, { id: "ins-pel-2" }];
      await failMediator.queue(
        { alwaysFail: true, batchId: "pel-ins" },
        createMessageStream(messages),
        errWorkers,
        {
          totalCount: 2,
          batchSize: 1,
          maxRetries: 2,
        },
      );
      assertEquals(promptCalled, true);
    } finally {
      termErr();
    }

    const { workers: successWorkers, terminate: termSucc } = createWorkers(
      "./workers/process.success.worker.ts",
      "./workers/insert.success.worker.ts",
    );

    try {
      const succMediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: () => false,
        },
      );

      const insFinished: unknown[] = [];

      await succMediator.queue(
        { batchId: "pel-ins-recovered" },
        [{ id: "ins-pel-1" }, { id: "ins-pel-2" }],
        successWorkers,
        {
          totalCount: 2,
          batchSize: 1,
          maxRetries: 2,
          onInsertFinished: (p) => {
            insFinished.push(...p);
          },
        },
      );

      assertEquals(insFinished.length, 2);
    } finally {
      termSucc();
    }
  });

  it("Lifecycle logs forwarding: processing logs in init, execute, and teardown are caught", async () => {
    if (!isRedisConnected) return;

    const { workers, terminate } = createWorkers(
      "./workers/process.log.worker.ts",
      "./workers/insert.success.worker.ts",
    );

    try {
      const procLogs: string[] = [];

      const mediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: () => false,
        },
      );

      const messages = [{ id: "log-p-1" }, { id: "log-p-2" }];

      await mediator.queue(
        { batchId: "logs-proc-run" },
        createMessageStream(messages),
        workers,
        {
          totalCount: 2,
          batchSize: 2,
          maxRetries: 2,
          onProcessingLog: (lines) => {
            procLogs.push(...lines);
          },
        },
      );

      assertEquals(procLogs.includes("[Process Worker] init"), true);
      assertEquals(procLogs.includes("[Process Worker] execute"), true);
      assertEquals(procLogs.includes("[Process Worker] teardown"), true);
    } finally {
      terminate();
    }
  });

  it("Lifecycle logs forwarding: insert logs in init, execute, and teardown are caught", async () => {
    if (!isRedisConnected) return;

    const { workers, terminate } = createWorkers(
      "./workers/process.success.worker.ts",
      "./workers/insert.log.worker.ts",
    );

    try {
      const insLogs: string[] = [];

      const mediator = new RedisQueueWorkersMediator(
        redis.client,
        redisParams,
        {
          ...testOptions,
          onRetryPendingPrompt: () => false,
        },
      );

      const messages = [{ id: "log-i-1" }, { id: "log-i-2" }];

      await mediator.queue(
        { batchId: "logs-ins-run" },
        createMessageStream(messages),
        workers,
        {
          totalCount: 2,
          batchSize: 2,
          maxRetries: 2,
          onInsertLog: (lines) => {
            insLogs.push(...lines);
          },
        },
      );

      assertEquals(insLogs.includes("[Insert Worker] init"), true);
      assertEquals(insLogs.includes("[Insert Worker] execute"), true);
      assertEquals(insLogs.includes("[Insert Worker] teardown"), true);
    } finally {
      terminate();
    }
  });
});
