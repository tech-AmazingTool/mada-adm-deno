import type { MaybePromise } from "@scope/types/utils";

/**
 * Flexible configuration for workers used in the processing and insertion pipeline.
 * Can be a simple array of workers for processing, or a split configuration with
 * a specialized insert worker.
 */
export type WorkerPool =
  | Worker[]
  | {
    /** The workers responsible for processing the messages. */
    processing: Worker[];
    /** The specialized worker that handles database insertions. */
    insert?: Worker;
  };

/**
 * Contextual data provided for a specific batch.
 */
export type WorkerBatchContext<TProcessing, TInsert> =
  | TProcessing
  | {
    /** Context for the processing stage. */
    processing: TProcessing;
    /** Context for the insert stage. */
    insert: TInsert;
  };

/**
 * Progress data emitted by the workers after successful batch processing completions.
 */
export type WorkerBatchProcessingProgress = {
  /** Count of messages that have been successfully processed so far */
  current: number;
  /** Total count of messages to be processed */
  total: number;
  /** Processing progress rate between 0 and 1 */
  progress: number;
};

/**
 * Optional listeners for monitoring the queue execution.
 */
export interface QueueListeners<
  TProcessingFinishedPayload,
  TInsertFinishedPayload,
> {
  /** Invoked when a processing batch has completed. */
  onProcessingFinished?: (
    payload: TProcessingFinishedPayload[],
  ) => MaybePromise<void>;
  /** Invoked when a the prossessing job has progressed */
  onProcessingProgress?: (
    data: WorkerBatchProcessingProgress,
  ) => MaybePromise<void>;
  /** Forwards the lines of console logs from the processing worker */
  onProcessingLog?: (lines: string[]) => MaybePromise<void>;
  /** Invoked when an insert task has completed. */
  onInsertFinished?: (payload: TInsertFinishedPayload[]) => MaybePromise<void>;
  /** Invoked when a the insert job has progressed */
  onInsertProgress?: (
    data: WorkerBatchProcessingProgress,
  ) => MaybePromise<void>;
  /** Forwards the lines of console logs from the insert worker */
  onInsertLog?: (lines: string[]) => MaybePromise<void>;
}

/**
 * Configuration options for the queue execution.
 */
export interface QueueOptions<
  TProcessingFinished = unknown,
  TInsertFinished = unknown,
> extends QueueListeners<TProcessingFinished, TInsertFinished> {
  /** Total count of messages */
  totalCount?: number;
  /** The batch size for processing messages concurrently. */
  batchSize?: number;
  /** Maximum number of retries per batch in case of an error. */
  maxRetries?: number;
  /** Whether to enable debug logging. */
  debug?: boolean;
}

/**
 * Coordinates a two-stage worker pipeline: a processing stage that transforms
 * incoming messages into insert-ready payloads, and an insert stage in which a
 * single dedicated worker persists those payloads to a database.
 *
 * @typeParam TContext - Contextual data shared across every message in a
 *   single batch (e.g. a batch identifier or run metadata).
 * @typeParam TMessage - The shape of each individual incoming message.
 *   Must be an object.
 * @typeParam TProcessingFinishedPayload - The type of data emitted when processing
 *   of a message or batch is finished. This data is also forwarded to the insert
 *   queue as the input for the insertion worker.
 * @typeParam TInsertContext - Contextual data supplied to the insert worker for
 *   each payload it receives from the processing stage.
 * @typeParam TInsertFinishedPayload - The type of data emitted when the insert worker
 *   has finished persisting a payload.
 */
export interface QueueWorkersMediator<
  TProcessingContext = unknown,
  TMessage extends object = object,
  TProcessingFinishedPayload = unknown,
  TInsertContext = unknown,
  TInsertFinishedPayload = unknown,
> {
  /**
   * Enqueues a batch of messages for processing together with shared context data
   * and a pool of workers to handle the processing task.
   *
   * @param context - Contextual data that applies to messages in this batch.
   * @param messages - The messages to push into the processing queue.
   * @param workers - The workers responsible for processing the messages.
   * @param options - Configuration options for the queue execution (listeners, batchSize).
   */
  queue(
    context: WorkerBatchContext<TProcessingContext, TInsertContext>,
    messages: TMessage[] | ReadableStream<TMessage>,
    workers: WorkerPool,
    options?: QueueOptions<TProcessingFinishedPayload, TInsertFinishedPayload>,
  ): Promise<void>;
}

export interface QueueWorkerLifecycle<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
> {
  /** Optional callback executed once before processing any messages. */
  init?: (
    context: TContext,
    options: { workerMetadata: { type: "process" | "insert"; index: number } },
    log: (...lines: string[]) => void,
  ) => MaybePromise<void>;
  /** Required callback executed for each batch of messages. */
  execute: (
    context: TContext,
    batchOfMessages: TMessage[],
    extra: {
      retryCount: number;
      workerMetadata: { type: "process" | "insert"; index: number };
    },
    log: (...lines: string[]) => void,
  ) => MaybePromise<TFinishedPayload[] | void>;
  /** Optional callback executed after all messages have been processed or on error. */
  teardown?: (
    context: TContext,
    options: { workerMetadata: { type: "process" | "insert"; index: number } },
    log: (...lines: string[]) => void,
  ) => MaybePromise<void>;
}

/**
 * An executor interface that runs inside a worker thread to handle incoming
 * messages distributed by the QueueWorkersMediator.
 *
 * @typeParam TContext - Contextual data supplied to the executor.
 * @typeParam TMessage - The shape of the incoming messages to process.
 * @typeParam TFinishedPayload - The type of data emitted when processing is finished.
 */
export interface QueueWorkerExecutor<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
> {
  /**
   * Runs the worker by registering the lifecycle callbacks to process incoming messages.
   *
   * @param handler - An async function or lifecycle object to process batches.
   */
  run(
    handler:
      | QueueWorkerLifecycle<TContext, TMessage, TFinishedPayload>
      | QueueWorkerLifecycle<TContext, TMessage, TFinishedPayload>["execute"],
  ): void;
}
