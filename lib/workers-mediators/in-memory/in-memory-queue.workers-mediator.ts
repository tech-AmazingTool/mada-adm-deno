//
import type {
  QueueOptions,
  QueueWorkerExecutor,
  QueueWorkerLifecycle,
  QueueWorkersMediator,
  WorkerBatchContext,
  WorkerPool,
} from "../workers-mediators.d.ts";
import {
  DEFAULT_MAX_RETRIES,
  WORKER_EVENTS,
} from "../workers-mediators.const.ts";

/** Default batch size for messages. */
export const DEFAULT_BATCH_SIZE = 1;

/** Default high water mark for worker jobs. */
export const DEFAULT_WORKER_JOB_HWM = 1;

type EventWorkerIdPayload = { workerId: string };

type WorkerReadableBatchData<TMessage> = {
  jobId: string;
  batch: TMessage[];
};

type AppToWorkerInitMessage<TContext, TMessage> = {
  type: typeof WORKER_EVENTS.INIT;
  readable: ReadableStream<WorkerReadableBatchData<TMessage>>;
  context: TContext;
  workerType: "process" | "insert";
  workerIndex: number;
  maxRetries?: number;
};

type WorkerToAppProcessingFinishedPayload<TEvent> = EventWorkerIdPayload & {
  type: typeof WORKER_EVENTS.PROCESSING_FINISHED;
  payload: TEvent[];
};

type WorkerToAppInsertFinishedPayload<TEvent> = EventWorkerIdPayload & {
  type: typeof WORKER_EVENTS.INSERT_FINISHED;
  payload: TEvent[];
};

type WorkerToAppLogPayload = {
  type: typeof WORKER_EVENTS.LOG;
  lines: string[];
};

type WorkerToAppDonePayload = {
  type: typeof WORKER_EVENTS.DONE;
};

/**
 * Configuration options for a WorkerJob.
 */
export interface WorkerJobOptions {
  /** The high water mark for the input and output streams. */
  hwm?: number;
  /** Maximum number of retries per batch in case of an error. */
  maxRetries?: number;
}

/**
 * Configuration options for the InMemoryQueueWorkersMediator.
 */
export interface InMemoryQueueWorkersMediatorOptions<_TMessage = unknown> {
  /** The default high water mark for processing workers. */
  processingHwm?: number;
  /** The default high water mark for the insert worker. */
  insertHwm?: number;
}

/**
 * Abstracts operations and attributes of a worker and its jobs.
 *
 * @typeParam TInputMessage - The type of the individual batch item input.
 * @typeParam TOutputMessage - The type of the individual batch item output.
 */
class WorkerJob<TInputMessage, TOutputMessage> {
  private _pendingTask: Promise<void> | null = null;
  private _pendingTaskResolve: (() => void) | null = null;
  private _outputController:
    | ReadableStreamDefaultController<
      TOutputMessage[]
    >
    | null = null;
  private _outputStream: ReadableStream<TOutputMessage[]> | null = null;
  private _inputWritable: WritableStream<TInputMessage[]> | null = null;

  public readonly jobIds = new Set<string>();
  public onJobCompleted?: (payload: TOutputMessage[]) => void;
  public onLog?: (lines: string[]) => void;

  #isDone!: Promise<boolean>;
  get isDone() {
    return this.#isDone;
  }

  constructor(
    private worker: Worker,
    private type: "process" | "insert",
    private context: unknown,
    private workerIndex: number,
    options: WorkerJobOptions = {},
  ) {
    const { hwm = DEFAULT_WORKER_JOB_HWM, maxRetries = DEFAULT_MAX_RETRIES } =
      options;
    const transform = new TransformStream<
      TInputMessage[],
      WorkerReadableBatchData<TInputMessage>
    >(
      {
        transform: (batch, controller) => {
          const jobId = crypto.randomUUID();
          this.jobIds.add(jobId);

          // Initialize pending task if null (singleton-ish behavior)
          this.ensurePendingTask();

          // Enqueue the job to the stream instead of sending individual postMessage
          controller.enqueue({ jobId, batch });
        },
      },
      { highWaterMark: hwm },
      { highWaterMark: hwm },
    );
    this._inputWritable = transform.writable;

    // Send a single INIT message transferring the readable stream to the worker
    this.worker.postMessage(
      {
        type: WORKER_EVENTS.INIT,
        readable: transform.readable,
        context: this.context,
        workerType: this.type,
        workerIndex: this.workerIndex,
        maxRetries,
      } as AppToWorkerInitMessage<unknown, TInputMessage>,
      [transform.readable],
    );

    let resolveIsDoneFn!: (value: boolean | PromiseLike<boolean>) => void;
    this.#isDone = new Promise((resolve) => {
      resolveIsDoneFn = resolve;
    });

    this.worker.addEventListener("message", (payload: MessageEvent) => {
      const data = payload.data as
        | WorkerToAppProcessingFinishedPayload<TOutputMessage>
        | WorkerToAppInsertFinishedPayload<TOutputMessage>
        | WorkerToAppLogPayload
        | WorkerToAppDonePayload;

      if (
        data &&
        (data.type === WORKER_EVENTS.PROCESSING_FINISHED ||
          data.type === WORKER_EVENTS.INSERT_FINISHED) &&
        this.jobIds.has(data.workerId)
      ) {
        this.jobIds.delete(data.workerId);
        this.onJobCompleted?.(data.payload);

        if (this._outputController) {
          this._outputController.enqueue(data.payload);
        }

        if (this.jobIds.size === 0) {
          this._pendingTaskResolve?.();
          this._pendingTask = null;
          this._pendingTaskResolve = null;
        }
      }

      if (data.type === WORKER_EVENTS.LOG) {
        this.onLog?.(data.lines);
      }

      if (data.type === WORKER_EVENTS.DONE) {
        resolveIsDoneFn(true);
      }
    });

    this.worker.addEventListener("error", (error: ErrorEvent) => {
      console.error(`Worker error:`, error.message);
      throw error.error || error;
    });
  }

  private ensurePendingTask() {
    if (!this._pendingTask) {
      this._pendingTask = new Promise((resolve) => {
        this._pendingTaskResolve = resolve;
      });
    }
  }

  /**
   * Pending task of the worker which is either null or a promise of void.
   */
  get pendingTask(): Promise<void> | null {
    // Getter returns null if no jobs are active, or the current promise.
    return this._pendingTask;
  }

  /**
   * The input writable stream to send messages to the worker.
   */
  get inputWritableStream(): WritableStream<TInputMessage[]> {
    return this._inputWritable!;
  }

  /**
   * The output readable stream to receive results from the worker.
   */
  get outputReadableStream(): ReadableStream<TOutputMessage[]> {
    if (!this._outputStream) {
      this._outputStream = new ReadableStream({
        start: (controller) => {
          this._outputController = controller;
        },
      });
    }
    return this._outputStream;
  }

  /**
   * Waits for the pending task to resolve, then closes the input and output streams.
   */
  async close(): Promise<void> {
    try {
      await this._inputWritable?.close();
    } catch (_err) {
      // Ignore if already closed or aborted
    }
    if (this._pendingTask) {
      await this._pendingTask;
    }
    this._outputController?.close();
  }
}

/**
 * An in-memory implementation of the QueueWorkersMediator interface.
 * Coordinates a simplified two-stage worker pipeline entirely in the local process.
 *
 * @typeParam TProcessingContext - Contextual data shared across every message in a
 *   single batch (e.g. a batch identifier or run metadata).
 * @typeParam TMessage - The shape of each individual incoming message.
 *   Must be an object.
 * @typeParam TProcessingFinishedPayload - The type of data emitted when processing
 *   of a message or batch is finished.
 * @typeParam TInsertContext - Contextual data supplied to the insert worker for
 *   each payload it receives from the processing stage.
 * @typeParam TInsertFinishedPayload - The type of data emitted when the insert worker
 *   has finished persisting a payload.
 */
export class InMemoryQueueWorkersMediator<
  TProcessingContext = unknown,
  TMessage extends object = object,
  TProcessingFinishedPayload = unknown,
  TInsertContext = unknown,
  TInsertFinishedPayload = unknown,
> implements
  QueueWorkersMediator<
    TProcessingContext,
    TMessage,
    TProcessingFinishedPayload,
    TInsertContext,
    TInsertFinishedPayload
  > {
  #options:
    & Required<
      Omit<
        InMemoryQueueWorkersMediatorOptions<TMessage>,
        "processingHwm" | "insertHwm"
      >
    >
    & {
      processingHwm?: number;
      insertHwm?: number;
    };

  /**
   * Initializes a new instance of the InMemoryQueueWorkersMediator.
   *
   * @param options - Configuration options for the mediator (HWM settings).
   */
  constructor(options: InMemoryQueueWorkersMediatorOptions<TMessage> = {}) {
    this.#options = {
      processingHwm: options.processingHwm,
      insertHwm: options.insertHwm,
    };
  }

  /**
   * Enqueues a batch of messages for processing together with shared context data
   * and a pool of workers to handle the processing task.
   *
   * @param context - Contextual data that applies to messages in this batch.
   * @param messages - The messages to push into the processing queue.
   * @param workers - The workers responsible for processing the messages.
   * @param options - Configuration options for the queue execution (listeners, batchSize).
   */
  async queue(
    context: WorkerBatchContext<TProcessingContext, TInsertContext>,
    messages: TMessage[] | ReadableStream<TMessage>,
    workers: WorkerPool,
    options?: QueueOptions<TProcessingFinishedPayload, TInsertFinishedPayload>,
  ): Promise<void> {
    const {
      onProcessingFinished,
      onInsertFinished,
      onProcessingProgress,
      onInsertProgress,
      onProcessingLog,
      onInsertLog,
      totalCount = 0,
      batchSize = DEFAULT_BATCH_SIZE,
      maxRetries,
    } = options ?? {};
    const actualBatchSize = Math.max(1, batchSize);

    const processingWorkers = Array.isArray(workers)
      ? workers
      : workers.processing;
    const workersCount = processingWorkers.length;

    const isSplitContext = context &&
      typeof context === "object" &&
      ("processing" in context || "insert" in context);

    const processingContext = isSplitContext
      ? (context as { processing: TProcessingContext }).processing
      : (context as TProcessingContext);

    const insertContext = isSplitContext
      ? (context as { insert: TInsertContext }).insert
      : (undefined as unknown as TInsertContext);

    const processingJobs = processingWorkers.map(
      (w, i) =>
        new WorkerJob<TMessage, TProcessingFinishedPayload>(
          w,
          "process",
          processingContext,
          i,
          { hwm: this.#options.processingHwm, maxRetries },
        ),
    );

    let processedMessagesCount = 0;

    processingJobs.forEach((job) => {
      job.onJobCompleted = (event) => {
        onProcessingFinished?.(event);
        processedMessagesCount += event.length;
        onProcessingProgress?.({
          current: processedMessagesCount,
          total: totalCount,
          progress: totalCount > 0 ? (processedMessagesCount / totalCount) : 0,
        });
      };

      job.onLog = (lines) => {
        onProcessingLog?.(lines);
      };
    });

    const messagesReadable = (() => {
      if (Array.isArray(messages)) {
        let i = 0;
        return new ReadableStream<TMessage[]>(
          {
            pull(controller) {
              if (i < messages.length) {
                controller.enqueue(messages.slice(i, i + actualBatchSize));
                i += actualBatchSize;
              } else {
                controller.close();
              }
            },
          },
          { highWaterMark: workersCount },
        );
      }

      // messages is a ReadableStream<TMessage>
      let currentBatch: TMessage[] = [];
      const transformer = new TransformStream<TMessage, TMessage[]>(
        {
          transform(chunk, controller) {
            currentBatch.push(chunk);
            if (currentBatch.length >= actualBatchSize) {
              controller.enqueue(currentBatch);
              currentBatch = [];
            }
          },
          flush(controller) {
            if (currentBatch.length > 0) {
              controller.enqueue(currentBatch);
            }
          },
        },
        { highWaterMark: actualBatchSize * workersCount },
        {
          highWaterMark: workersCount,
        },
      );

      return messages.pipeThrough(transformer);
    })();

    const assignerWritable = (() => {
      let workerIndex = 0;
      return new WritableStream<TMessage[]>(
        {
          write: async (chunk) => {
            const job = processingJobs[workerIndex];
            const writer = job.inputWritableStream.getWriter();
            await writer.ready;
            await writer.write(chunk);
            writer.releaseLock();
            workerIndex = (workerIndex + 1) % processingJobs.length;
          },
          close: async () => {
            for (const job of processingJobs) {
              await job.close();
            }
          },
        },
        { highWaterMark: workersCount },
      );
    })();

    const processingWritingPipeline = messagesReadable.pipeTo(assignerWritable);

    let insertWritingPipeline: Promise<void> | null = null;
    let insertJob:
      | WorkerJob<
        TProcessingFinishedPayload,
        TInsertFinishedPayload
      >
      | null = null;

    const insertWorker = Array.isArray(workers) ? undefined : workers.insert;

    if (insertWorker) {
      insertJob = new WorkerJob(insertWorker, "insert", insertContext, 0, {
        hwm: this.#options.insertHwm,
        maxRetries,
      });

      let insertedMessagesCount = 0;

      insertJob.onJobCompleted = (event) => {
        onInsertFinished?.(event);
        insertedMessagesCount += event.length;
        onInsertProgress?.({
          current: insertedMessagesCount,
          total: totalCount,
          progress: totalCount > 0 ? (insertedMessagesCount / totalCount) : 0,
        });
      };

      insertJob.onLog = (lines) => {
        onInsertLog?.(lines);
      };

      const gathererReadable = new ReadableStream<TProcessingFinishedPayload[]>(
        {
          start: async (controller) => {
            await Promise.all(
              processingJobs.map(async (job) => {
                for await (const batch of job.outputReadableStream) {
                  controller.enqueue(batch);
                }
              }),
            );
            controller.close();
          },
        },
      );

      insertWritingPipeline = gathererReadable.pipeTo(
        insertJob.inputWritableStream,
      );
    }

    await Promise.all(
      [processingWritingPipeline, insertWritingPipeline].filter(
        (p): p is Promise<void> => p !== null,
      ),
    );

    if (insertJob) {
      // The stream itself is already closed by pipeTo, but we still need to wait for its internal tasks
      await insertJob.close();
    }

    const pendingTasks = [
      ...processingJobs.map((j) => j.pendingTask),
      insertJob?.pendingTask,
    ].filter((t): t is Promise<void> => t !== null);

    await Promise.all(pendingTasks);

    await Promise.all(processingJobs.map((j) => j.isDone));
    if (insertJob) {
      await insertJob.isDone;
    }
  }
}

/**
 * Executes a specific worker role (process or insert) in the background thread.
 */
export class InMemoryQueueWorkerExecutor<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
> implements QueueWorkerExecutor<TContext, TMessage, TFinishedPayload> {
  constructor() {}

  /**
   * Runs the worker by registering the lifecycle callbacks to process incoming messages.
   */
  run(
    handler:
      | QueueWorkerLifecycle<TContext, TMessage, TFinishedPayload>
      | QueueWorkerLifecycle<TContext, TMessage, TFinishedPayload>["execute"],
  ): void {
    const execute = typeof handler === "function" ? handler : handler.execute;
    const initHook = typeof handler === "object" ? handler.init : undefined;
    const teardownHook = typeof handler === "object"
      ? handler.teardown
      : undefined;

    function log(...lines: string[]) {
      self.postMessage(
        {
          type: WORKER_EVENTS.LOG,
          lines,
        } satisfies WorkerToAppLogPayload,
      );
    }

    self.addEventListener("message", async (event: Event) => {
      const e = event as MessageEvent;
      if (e.data?.type !== WORKER_EVENTS.INIT) {
        return;
      }

      const {
        readable,
        context,
        workerType,
        workerIndex,
        maxRetries = DEFAULT_MAX_RETRIES,
      } = e.data as AppToWorkerInitMessage<TContext, TMessage>;

      const finishEventType = workerType === "process"
        ? WORKER_EVENTS.PROCESSING_FINISHED
        : WORKER_EVENTS.INSERT_FINISHED;

      await initHook?.(context, {
        workerMetadata: { type: workerType, index: workerIndex },
      }, log);

      let isTornDown = false;
      const safeTeardown = async () => {
        if (!isTornDown) {
          isTornDown = true;
          await teardownHook?.(context, {
            workerMetadata: { type: workerType, index: workerIndex },
          }, log);
        }
      };

      try {
        for await (const { jobId, batch } of readable) {
          let attempt = 0;
          while (true) {
            try {
              const result = await execute(context, batch, {
                retryCount: attempt,
                workerMetadata: { type: workerType, index: workerIndex },
              }, log);
              postMessage({
                type: finishEventType,
                workerId: jobId,
                payload: result as TFinishedPayload[],
              });
              break; // Success, break out of retry loop
            } catch (err) {
              attempt++;
              if (attempt >= maxRetries) {
                await safeTeardown();
                throw err;
              }
              // Wait backoff before retrying
              await new Promise((resolve) =>
                setTimeout(resolve, 2 ** attempt * 100)
              );
            }
          }
        }
      } catch (err) {
        await safeTeardown();
        throw err;
      }

      await safeTeardown();

      self.postMessage({
        type: WORKER_EVENTS.DONE,
      });
    });
  }
}

let _instance:
  | InMemoryQueueWorkersMediator<
    unknown,
    object,
    unknown,
    unknown,
    unknown
  >
  | null = null;

/**
 * Injects a singleton instance of the InMemoryQueueWorkersMediator.
 *
 * @returns The singleton instance of the mediator.
 */
export function injectInMemoryQueueWorkersMediator<
  TProcessingContext = unknown,
  TMessage extends object = object,
  TProcessingFinishedPayload = unknown,
  TInsertContext = unknown,
  TInsertFinishedPayload = unknown,
>(
  options: InMemoryQueueWorkersMediatorOptions<TMessage> = {},
): InMemoryQueueWorkersMediator<
  TProcessingContext,
  TMessage,
  TProcessingFinishedPayload,
  TInsertContext,
  TInsertFinishedPayload
> {
  if (!_instance) {
    _instance = new InMemoryQueueWorkersMediator(
      options,
    ) as unknown as InMemoryQueueWorkersMediator<
      unknown,
      object,
      unknown,
      unknown,
      unknown
    >;
  }
  return _instance as unknown as InMemoryQueueWorkersMediator<
    TProcessingContext,
    TMessage,
    TProcessingFinishedPayload,
    TInsertContext,
    TInsertFinishedPayload
  >;
}

/**
 * Injects a new instance of the InMemoryQueueWorkerExecutor.
 *
 * @returns A new instance of the executor.
 */
export function injectInMemoryQueueWorkerExecutor<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
>(): InMemoryQueueWorkerExecutor<TContext, TMessage, TFinishedPayload> {
  return new InMemoryQueueWorkerExecutor();
}
