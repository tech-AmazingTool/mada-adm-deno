import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import { injectInMemoryQueueWorkersMediator } from "./in-memory-queue.workers-mediator.ts";

describe("InMemoryQueueWorkersMediator", () => {
  it(
    "successfully coordinates a split processing and insert pipeline with array input",
    async () => {
      // 1. Create a fresh mediator for testing
      const mediator = injectInMemoryQueueWorkersMediator();

      // 2. Instantiate mock workers pointing to the fixture
      const processingWorker1 = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );
      const processingWorker2 = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );
      const insertWorker = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );

      // 3. Define the batch of messages and tracking arrays
      const messages = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const finishedEvents: Array<{ completed: number; ctx: string }> = [];
      const insertEvents: Array<{ saved: string; ctx: string }> = [];

      const processingLogs: string[] = [];
      const insertLogs: string[] = [];

      // 4. Run the queue
      await mediator.queue(
        { processing: "proc-ctx", insert: "ins-ctx" },
        messages,
        {
          processing: [processingWorker1, processingWorker2],
          insert: insertWorker,
        },
        {
          onProcessingFinished: (evt) => {
            finishedEvents.push(
              ...(evt as Array<{ completed: number; ctx: string }>),
            );
          },
          onProcessingLog: (lines) => {
            processingLogs.push(...lines);
          },
          onInsertFinished: (evt) => {
            insertEvents.push(
              ...(evt as Array<{ saved: string; ctx: string }>),
            );
          },
          onInsertLog: (lines) => {
            insertLogs.push(...lines);
          },
          batchSize: 2,
        },
      );

      // 5. Assert Processing Output
      assertEquals(finishedEvents.length, 3);
      const completedIds = finishedEvents.map((e) => e.completed).sort();
      assertEquals(completedIds, [1, 2, 3]);
      assertEquals(finishedEvents[0].ctx, "proc-ctx");

      // 6. Assert Insertion Output
      assertEquals(insertEvents.length, 3);
      const savedResults = insertEvents.map((e) => e.saved).sort();
      assertEquals(savedResults, ["Processed 1", "Processed 2", "Processed 3"]);
      assertEquals(insertEvents[0].ctx, "ins-ctx");

      assertEquals(processingLogs.includes("Init log"), true);
      assertEquals(processingLogs.includes("Execute log"), true);
      assertEquals(processingLogs.includes("Teardown log"), true);
      assertEquals(insertLogs.includes("Init log"), true);
      assertEquals(insertLogs.includes("Execute log"), true);
      assertEquals(insertLogs.includes("Teardown log"), true);

      // 7. Teardown
      processingWorker1.terminate();
      processingWorker2.terminate();
      insertWorker.terminate();
    },
  );

  it(
    "successfully coordinates a split processing and insert pipeline with streaming input",
    async () => {
      const mediator = injectInMemoryQueueWorkersMediator();

      const messages = [
        { id: 10, val: 10 },
        { id: 20, val: 20 },
        { id: 30, val: 30 },
      ];

      // Create a ReadableStream from the messages array
      const messageStream = new ReadableStream({
        start(controller) {
          for (const msg of messages) {
            controller.enqueue(msg);
          }
          controller.close();
        },
      });

      const worker1 = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );
      const worker2 = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );
      const insertWorker = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );

      const context = {
        processing: "proc-stream-ctx",
        insert: "ins-stream-ctx",
      };

      const finishedEvents: Array<{ completed: number; ctx: string }> = [];
      const insertEvents: Array<{ saved: string; ctx: string }> = [];

      await mediator.queue(
        context,
        messageStream,
        {
          processing: [worker1, worker2],
          insert: insertWorker,
        },
        {
          batchSize: 2,
          onProcessingFinished: (events) => {
            finishedEvents.push(
              ...(events as Array<{ completed: number; ctx: string }>),
            );
          },
          onInsertFinished: (events) => {
            insertEvents.push(
              ...(events as Array<{ saved: string; ctx: string }>),
            );
          },
        },
      );

      // Verify processing results (3 messages processed)
      assertEquals(finishedEvents.length, 3);
      const completedIds = finishedEvents.map((e) => e.completed).sort();
      assertEquals(completedIds, [10, 20, 30]);
      assertEquals(finishedEvents[0].ctx, "proc-stream-ctx");

      // Verify insert results (3 messages inserted)
      assertEquals(insertEvents.length, 3);
      const savedResults = insertEvents.map((e) => e.saved).sort();
      assertEquals(savedResults, [
        "Processed 10",
        "Processed 20",
        "Processed 30",
      ]);
      assertEquals(insertEvents[0].ctx, "ins-stream-ctx");

      // Clean up workers
      worker1.terminate();
      worker2.terminate();
      insertWorker.terminate();
    },
  );
});
