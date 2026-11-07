import { injectInMemoryQueueWorkerExecutor } from "./in-memory-queue.workers-mediator.ts";

const executor = injectInMemoryQueueWorkerExecutor<string, object, object>();

executor.run({
  init(_, __, log) {
    log("Init log");
  },
  execute(context, batch, { workerMetadata }, log) {
    log("Execute log");
    let result;
    if (workerMetadata.type === "process") {
      result = batch.map((message) => {
        const id = (message as { id: number }).id;
        return { result: `Processed ${id}`, completed: id, ctx: context };
      });
    } else {
      result = batch.map((message) => {
        const res = (message as { result: string }).result;
        return { saved: res, ctx: context };
      });
    }
    return result;
  },
  teardown(_, __, log) {
    log("Teardown log");
  },
});
