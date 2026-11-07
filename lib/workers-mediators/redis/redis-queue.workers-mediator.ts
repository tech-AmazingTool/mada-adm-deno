import type { RedisClient } from "@iuioiua/redis";

import {
  injectRedisConnection,
  type RedisConnectionParams,
} from "@scope/redis";
import type { MaybePromise } from "@scope/types/utils";

import {
  DEFAULT_MAX_RETRIES,
  WORKER_EVENTS,
} from "../workers-mediators.const.ts";
import type {
  QueueOptions,
  QueueWorkerExecutor,
  QueueWorkerLifecycle,
  QueueWorkersMediator,
  WorkerBatchContext,
  WorkerPool,
} from "../workers-mediators.d.ts";

/** Default key for storing processing queue context in Redis. */
export const DEFAULT_PROCESSING_CONTEXT_KEY = "processing:context";

/** Default key for the processing queue Redis stream. */
export const DEFAULT_PROCESSING_STREAM_KEY = "processing:stream";

/** Default key for the list of failed processing message IDs in Redis. */
export const DEFAULT_PROCESSING_FAILED_IDS_KEY = "processing:failed-ids";

/** Default key for storing insert queue context in Redis. */
export const DEFAULT_INSERT_CONTEXT_KEY = "insert:context";

/** Default key for the insert queue Redis stream. */
export const DEFAULT_INSERT_STREAM_KEY = "insert:stream";

/** Default key for the list of failed insert message IDs in Redis. */
export const DEFAULT_INSERT_FAILED_IDS_KEY = "insert:failed-ids";

/** Default timeout for XREAD BLOCK in milliseconds. */
export const DEFAULT_XREAD_BLOCK_DURATION = 1000;

/** Default name for the processing Redis consumer group. */
export const DEFAULT_PROCESSING_CONSUMER_GROUP_NAME = "processing-group";

/** Default name for the insert Redis consumer group. */
export const DEFAULT_INSERT_CONSUMER_GROUP_NAME = "insert-group";

/** Default key for storing the last persisted message in Redis. */
export const DEFAULT_PERSISTED_LAST_MESSAGE_KEY = "persisted-last:message";

/**
 * Configuration options for the RedisQueueWorkersMediator.
 */
export interface RedisQueueWorkersMediatorOptions<
  TMessage = unknown,
  TProcessingContext = unknown,
> {
  /** Redis key for storing processing queue context. */
  processingContextKey?: string;
  /** Redis key for the processing queue messages stream. */
  processingStreamKey?: string;
  /** Redis key for the list of failed processing message IDs. */
  processingFailedIdsKey?: string;
  /** Redis key for storing insert queue context. */
  insertContextKey?: string;
  /** Redis key for the insert queue messages stream. */
  insertStreamKey?: string;
  /** Redis key for the list of failed insert message IDs. */
  insertFailedIdsKey?: string;
  /** Timeout for XREAD BLOCK in milliseconds. */
  xreadBlockDuration?: number;
  /** Name of the processing Redis consumer group. */
  processingConsumerGroupName?: string;
  /** Name of the insert Redis consumer group. */
  insertConsumerGroupName?: string;
  /** Redis key for the last persisted message. */
  persistedLastMessageKey?: string;
  /** Whether to enable debug logging. */
  debug?: boolean;
  /** Callback prompting whether to retry pending messages. */
  onRetryPendingPrompt?: (
    context: TProcessingContext,
    pelCount: number,
  ) => MaybePromise<boolean>;
  /** Callback to compare equivalence of two messages for resuming streaming. */
  compareMessages?: (a: TMessage, b: TMessage) => boolean;
}

interface WorkerInitPayload<TContext> {
  type: typeof WORKER_EVENTS.INIT;
  redisConfig: RedisConnectionParams;
  workerType: "process" | "insert";
  workerMetadata: { type: "process" | "insert"; index: number };
  context: TContext;
  streamKey: string;
  processingStreamKey: string;
  failedIdsKey: string;
  nextStreamKey?: string;
  consumerGroupName: string;
  processingGroupName: string;
  batchSize: number;
  xreadBlockDuration: number;
  maxRetries: number;
  debug: boolean;
  totalCount: number;
}

interface StreamGroupInfo {
  length: number;
  pending: number;
  lag: number;
}

async function getStreamGroupInfo(
  client: RedisClient,
  stream: string,
  group: string,
): Promise<StreamGroupInfo> {
  try {
    const lenRes = (await client.sendCommand(["XLEN", stream])) as number;
    const length = typeof lenRes === "number" ? lenRes : 0;

    const groupsRes = (await client.sendCommand([
      "XINFO",
      "GROUPS",
      stream,
    ])) as unknown[];

    if (!Array.isArray(groupsRes) || groupsRes.length === 0) {
      return { length, pending: 0, lag: 0 };
    }

    const groupInfo = groupsRes.find((g) => {
      if (Array.isArray(g)) {
        const nameIdx = g.indexOf("name");
        return nameIdx !== -1 && g[nameIdx + 1] === group;
      }
      return (
        g !== null &&
        typeof g === "object" &&
        "name" in g &&
        (g as { name: string }).name === group
      );
    });

    if (!groupInfo) {
      return { length, pending: 0, lag: 0 };
    }

    let pending = 0;
    let lag = 0;

    if (Array.isArray(groupInfo)) {
      const pIdx = groupInfo.indexOf("pending");
      const lIdx = groupInfo.indexOf("lag");
      pending = pIdx !== -1 ? Number(groupInfo[pIdx + 1]) || 0 : 0;
      lag = lIdx !== -1 && groupInfo[lIdx + 1] !== null
        ? Number(groupInfo[lIdx + 1]) || 0
        : 0;
    } else if (typeof groupInfo === "object" && groupInfo !== null) {
      const record = groupInfo as Record<string, unknown>;
      pending = Number(record.pending) || 0;
      lag = Number(record.lag) || 0;
    }

    return { length, pending, lag };
  } catch {
    return { length: 0, pending: 0, lag: 0 };
  }
}

async function getPelIds(
  client: RedisClient,
  stream: string,
  group: string,
): Promise<string[]> {
  try {
    const res = (await client.sendCommand([
      "XPENDING",
      stream,
      group,
      "-",
      "+",
      "10000",
    ])) as unknown[];

    if (!Array.isArray(res)) return [];
    const ids: string[] = [];
    for (const item of res) {
      if (Array.isArray(item) && item.length > 0) {
        ids.push(String(item[0]));
      }
    }
    return ids;
  } catch {
    return [];
  }
}

async function ensureConsumerGroup(
  client: RedisClient,
  stream: string,
  group: string,
): Promise<void> {
  try {
    await client.sendCommand([
      "XGROUP",
      "CREATE",
      stream,
      group,
      "0",
      "MKSTREAM",
    ]);
  } catch (err: unknown) {
    const error = err as { message?: string };
    if (!error?.message?.includes("BUSYGROUP")) {
      throw err;
    }
  }
}

/**
 * A Redis-backed implementation of the QueueWorkersMediator interface.
 * Coordinates a two-stage worker pipeline using Redis streams for message queuing,
 * consumer groups for load distribution, and PEL/failed-ids lists for resilient recovery.
 */
export class RedisQueueWorkersMediator<
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
  #client: RedisClient;
  #redisConfig: RedisConnectionParams;
  #options: Required<
    Omit<
      RedisQueueWorkersMediatorOptions<TMessage, TProcessingContext>,
      "onRetryPendingPrompt" | "compareMessages"
    >
  >;
  #onRetryPendingPrompt?: (
    context: TProcessingContext,
    pelCount: number,
  ) => MaybePromise<boolean>;
  #compareMessages?: (a: TMessage, b: TMessage) => boolean;

  /**
   * Initializes a new RedisQueueWorkersMediator instance.
   *
   * @param client - An active Redis client instance.
   * @param redisConfig - Connection parameters for Redis.
   * @param options - Configuration options for Redis keys and recovery callbacks.
   */
  constructor(
    client: RedisClient,
    redisConfig: RedisConnectionParams,
    options: RedisQueueWorkersMediatorOptions<
      TMessage,
      TProcessingContext
    > = {},
  ) {
    this.#client = client;
    this.#redisConfig = redisConfig;
    this.#onRetryPendingPrompt = options.onRetryPendingPrompt;
    this.#compareMessages = options.compareMessages;
    this.#options = {
      processingContextKey: options.processingContextKey ??
        DEFAULT_PROCESSING_CONTEXT_KEY,
      processingStreamKey: options.processingStreamKey ??
        DEFAULT_PROCESSING_STREAM_KEY,
      processingFailedIdsKey: options.processingFailedIdsKey ??
        DEFAULT_PROCESSING_FAILED_IDS_KEY,
      insertContextKey: options.insertContextKey ?? DEFAULT_INSERT_CONTEXT_KEY,
      insertStreamKey: options.insertStreamKey ?? DEFAULT_INSERT_STREAM_KEY,
      insertFailedIdsKey: options.insertFailedIdsKey ??
        DEFAULT_INSERT_FAILED_IDS_KEY,
      xreadBlockDuration: options.xreadBlockDuration ??
        DEFAULT_XREAD_BLOCK_DURATION,
      processingConsumerGroupName: options.processingConsumerGroupName ??
        DEFAULT_PROCESSING_CONSUMER_GROUP_NAME,
      insertConsumerGroupName: options.insertConsumerGroupName ??
        DEFAULT_INSERT_CONSUMER_GROUP_NAME,
      persistedLastMessageKey: options.persistedLastMessageKey ??
        DEFAULT_PERSISTED_LAST_MESSAGE_KEY,
      debug: options.debug ?? false,
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
    options: QueueOptions<
      TProcessingFinishedPayload,
      TInsertFinishedPayload
    > = {},
  ): Promise<void> {
    const {
      onProcessingFinished,
      onInsertFinished,
      onProcessingProgress,
      onInsertProgress,
      onProcessingLog,
      onInsertLog,
      totalCount = 0,
      batchSize = 1,
      maxRetries = DEFAULT_MAX_RETRIES,
      debug = this.#options.debug,
    } = options;

    const actualBatchSize = Math.max(1, batchSize);

    const isSplitContext = context &&
      typeof context === "object" &&
      ("processing" in context || "insert" in context);

    const processingContext = isSplitContext
      ? (context as { processing: TProcessingContext }).processing
      : (context as TProcessingContext);

    const insertContext = isSplitContext
      ? (context as { insert: TInsertContext }).insert
      : (undefined as unknown as TInsertContext);

    const processingWorkers = Array.isArray(workers)
      ? workers
      : workers.processing;
    const insertWorker = Array.isArray(workers) ? undefined : workers.insert;

    let processedMessagesCount = 0;
    let insertedMessagesCount = 0;
    let processingStreamIsDone = false;

    // Check last persisted context in Redis
    const lastPersistedContext = await this.persistedContext;

    if (lastPersistedContext) {
      await ensureConsumerGroup(
        this.#client,
        this.#options.processingStreamKey,
        this.#options.processingConsumerGroupName,
      );
      if (insertWorker) {
        await ensureConsumerGroup(
          this.#client,
          this.#options.insertStreamKey,
          this.#options.insertConsumerGroupName,
        );
      }

      const procInfo = await getStreamGroupInfo(
        this.#client,
        this.#options.processingStreamKey,
        this.#options.processingConsumerGroupName,
      );
      const insInfo = insertWorker
        ? await getStreamGroupInfo(
          this.#client,
          this.#options.insertStreamKey,
          this.#options.insertConsumerGroupName,
        )
        : { length: 0, pending: 0, lag: 0 };

      processedMessagesCount = Math.max(
        0,
        totalCount - procInfo.pending - procInfo.lag,
      );
      insertedMessagesCount = Math.max(
        0,
        totalCount - insInfo.pending - insInfo.lag,
      );
      processingStreamIsDone = totalCount > 0 && procInfo.length >= totalCount;

      const procPelIds = await getPelIds(
        this.#client,
        this.#options.processingStreamKey,
        this.#options.processingConsumerGroupName,
      );
      const recoverCmds: string[][] = [["MULTI"]];
      recoverCmds.push(["DEL", this.#options.processingFailedIdsKey]);
      if (procPelIds.length > 0) {
        recoverCmds.push([
          "RPUSH",
          this.#options.processingFailedIdsKey,
          ...procPelIds,
        ]);
      }
      if (insertWorker) {
        const insPelIds = await getPelIds(
          this.#client,
          this.#options.insertStreamKey,
          this.#options.insertConsumerGroupName,
        );
        recoverCmds.push(["DEL", this.#options.insertFailedIdsKey]);
        if (insPelIds.length > 0) {
          recoverCmds.push([
            "RPUSH",
            this.#options.insertFailedIdsKey,
            ...insPelIds,
          ]);
        }
      }
      recoverCmds.push(["EXEC"]);
      await this.#client.pipelineCommands(recoverCmds);
    } else {
      await this.clearPersisted();

      const contextCmds: string[][] = [
        [
          "SET",
          this.#options.processingContextKey,
          JSON.stringify(processingContext),
        ],
      ];
      if (insertContext) {
        contextCmds.push([
          "SET",
          this.#options.insertContextKey,
          JSON.stringify(insertContext),
        ]);
      }
      await this.#client.pipelineCommands(contextCmds);

      await ensureConsumerGroup(
        this.#client,
        this.#options.processingStreamKey,
        this.#options.processingConsumerGroupName,
      );
      if (insertWorker) {
        await ensureConsumerGroup(
          this.#client,
          this.#options.insertStreamKey,
          this.#options.insertConsumerGroupName,
        );
      }
    }

    if (totalCount > 0) {
      await onProcessingProgress?.({
        current: processedMessagesCount,
        total: totalCount,
        progress: processedMessagesCount / totalCount,
      });
      if (insertWorker) {
        await onInsertProgress?.({
          current: insertedMessagesCount,
          total: totalCount,
          progress: insertedMessagesCount / totalCount,
        });
      }
    }

    if (!processingStreamIsDone) {
      const lastPersistedMessage = await this.persistedLastMessage;
      let shouldSkipMessage = lastPersistedMessage !== null;
      const compareFn = this.#compareMessages ??
        ((a: TMessage, b: TMessage) => JSON.stringify(a) === JSON.stringify(b));

      let currentStreamBatch: TMessage[] = [];

      const enqueueStreamBatch = async (batch: TMessage[]) => {
        if (batch.length === 0) return;
        const cmds: string[][] = [["MULTI"]];
        for (const msg of batch) {
          cmds.push([
            "XADD",
            this.#options.processingStreamKey,
            "*",
            "data",
            JSON.stringify(msg),
          ]);
        }
        cmds.push([
          "SET",
          this.#options.persistedLastMessageKey,
          JSON.stringify(batch[batch.length - 1]),
        ]);
        cmds.push(["EXEC"]);
        await this.#client.pipelineCommands(cmds);
      };

      const handleItem = async (msg: TMessage) => {
        if (shouldSkipMessage) {
          if (lastPersistedMessage && compareFn(msg, lastPersistedMessage)) {
            shouldSkipMessage = false;
          }
          return;
        }

        currentStreamBatch.push(msg);
        if (currentStreamBatch.length >= actualBatchSize) {
          await enqueueStreamBatch(currentStreamBatch);
          currentStreamBatch = [];
        }
      };

      if (Array.isArray(messages)) {
        for (const msg of messages) {
          await handleItem(msg);
        }
      } else {
        for await (const msg of messages) {
          await handleItem(msg);
        }
      }

      if (currentStreamBatch.length > 0) {
        await enqueueStreamBatch(currentStreamBatch);
        currentStreamBatch = [];
      }
    }

    let shouldDoJob = true;

    while (shouldDoJob) {
      const allWorkers = [
        ...processingWorkers.map((w, i) => ({
          worker: w,
          type: "process" as const,
          index: i,
        })),
        ...(insertWorker
          ? [{ worker: insertWorker, type: "insert" as const, index: 0 }]
          : []),
      ];

      await new Promise<void>((resolve, reject) => {
        let workersDoneCount = 0;
        const cleanups: (() => void)[] = [];

        const finish = () => {
          cleanups.forEach((c) => c());
          resolve();
        };

        allWorkers.forEach(({ worker, type, index }) => {
          const onMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data || typeof data !== "object") return;

            switch (data.type) {
              case WORKER_EVENTS.PROCESSING_FINISHED: {
                const payload = data.payload as TProcessingFinishedPayload[];
                processedMessagesCount += payload.length;
                onProcessingFinished?.(payload);
                onProcessingProgress?.({
                  current: processedMessagesCount,
                  total: totalCount,
                  progress: totalCount > 0
                    ? (processedMessagesCount / totalCount)
                    : 0,
                });
                break;
              }
              case WORKER_EVENTS.INSERT_FINISHED: {
                const payload = data.payload as TInsertFinishedPayload[];
                insertedMessagesCount += payload.length;
                onInsertFinished?.(payload);
                onInsertProgress?.({
                  current: insertedMessagesCount,
                  total: totalCount,
                  progress: totalCount > 0
                    ? (insertedMessagesCount / totalCount)
                    : 0,
                });
                break;
              }
              case WORKER_EVENTS.LOG: {
                const lines = data.lines as string[];
                if (type === "process") {
                  onProcessingLog?.(lines);
                } else {
                  onInsertLog?.(lines);
                }
                break;
              }
              case WORKER_EVENTS.DONE: {
                workersDoneCount++;
                if (workersDoneCount === allWorkers.length) {
                  finish();
                }
                break;
              }
              case WORKER_EVENTS.INTERRUPTED: {
                if (debug) {
                  console.error(
                    `[Mediator] Worker ${type} #${index} interrupted:`,
                    data.error,
                  );
                }
                break;
              }
            }
          };

          const onError = (err: ErrorEvent) => {
            if (debug) {
              console.error(
                `[Mediator] Worker error on ${type} #${index}:`,
                err,
              );
            }
            reject(err.error || err);
          };

          worker.addEventListener("message", onMessage);
          worker.addEventListener("error", onError);

          cleanups.push(() => {
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
          });

          worker.postMessage(
            {
              type: WORKER_EVENTS.INIT,
              redisConfig: this.#redisConfig,
              workerType: type,
              workerMetadata: { type, index },
              context: type === "process" ? processingContext : insertContext,
              streamKey: type === "process"
                ? this.#options.processingStreamKey
                : this.#options.insertStreamKey,
              processingStreamKey: this.#options.processingStreamKey,
              failedIdsKey: type === "process"
                ? this.#options.processingFailedIdsKey
                : this.#options.insertFailedIdsKey,
              nextStreamKey: type === "process" && insertWorker
                ? this.#options.insertStreamKey
                : undefined,
              consumerGroupName: type === "process"
                ? this.#options.processingConsumerGroupName
                : this.#options.insertConsumerGroupName,
              processingGroupName: this.#options.processingConsumerGroupName,
              batchSize: actualBatchSize,
              xreadBlockDuration: this.#options.xreadBlockDuration,
              maxRetries,
              debug,
              totalCount,
            } satisfies WorkerInitPayload<unknown>,
          );
        });
      });

      const procGroup = await getStreamGroupInfo(
        this.#client,
        this.#options.processingStreamKey,
        this.#options.processingConsumerGroupName,
      );
      const insGroup = insertWorker
        ? await getStreamGroupInfo(
          this.#client,
          this.#options.insertStreamKey,
          this.#options.insertConsumerGroupName,
        )
        : { length: 0, pending: 0, lag: 0 };

      const totalPel = procGroup.pending + insGroup.pending;
      const hasPending = totalPel > 0 || procGroup.lag > 0 || insGroup.lag > 0;

      if (hasPending) {
        if (this.#onRetryPendingPrompt) {
          shouldDoJob = Boolean(
            await this.#onRetryPendingPrompt(processingContext, totalPel),
          );
        } else {
          shouldDoJob = false;
        }

        if (shouldDoJob) {
          const pPelIds = await getPelIds(
            this.#client,
            this.#options.processingStreamKey,
            this.#options.processingConsumerGroupName,
          );
          const retryCmds: string[][] = [["MULTI"]];
          retryCmds.push(["DEL", this.#options.processingFailedIdsKey]);
          if (pPelIds.length > 0) {
            retryCmds.push([
              "RPUSH",
              this.#options.processingFailedIdsKey,
              ...pPelIds,
            ]);
          }
          if (insertWorker) {
            const iPelIds = await getPelIds(
              this.#client,
              this.#options.insertStreamKey,
              this.#options.insertConsumerGroupName,
            );
            retryCmds.push(["DEL", this.#options.insertFailedIdsKey]);
            if (iPelIds.length > 0) {
              retryCmds.push([
                "RPUSH",
                this.#options.insertFailedIdsKey,
                ...iPelIds,
              ]);
            }
          }
          retryCmds.push(["EXEC"]);
          await this.#client.pipelineCommands(retryCmds);
        }
      } else {
        shouldDoJob = false;
        await this.clearPersisted();
      }
    }
  }

  /**
   * Retrieves the persisted context data for the processing stage.
   */
  get persistedContext(): Promise<TProcessingContext | null> {
    return (async () => {
      const raw = (await this.#client.sendCommand([
        "GET",
        this.#options.processingContextKey,
      ])) as string | null;

      return raw ? (JSON.parse(raw) as TProcessingContext) : null;
    })();
  }

  /**
   * Retrieves the last persisted message that was streamed.
   */
  get persistedLastMessage(): Promise<TMessage | null> {
    return (async () => {
      const raw = (await this.#client.sendCommand([
        "GET",
        this.#options.persistedLastMessageKey,
      ])) as string | null;
      if (!raw) return null;
      return JSON.parse(raw) as TMessage;
    })();
  }

  /**
   * Clears ONLY the queue-related stream and failed ID keys.
   */
  async clearQueue(): Promise<void> {
    const keys = [
      this.#options.processingStreamKey,
      this.#options.insertStreamKey,
      this.#options.processingFailedIdsKey,
      this.#options.insertFailedIdsKey,
    ];
    await this.#client.sendCommand(["DEL", ...keys]);
  }

  /**
   * Clears ALL persisted data from previous operations (contexts, streams, failed IDs, last message).
   */
  async clearPersisted(): Promise<void> {
    const keys = [
      this.#options.processingContextKey,
      this.#options.insertContextKey,
      this.#options.processingStreamKey,
      this.#options.insertStreamKey,
      this.#options.persistedLastMessageKey,
      this.#options.processingFailedIdsKey,
      this.#options.insertFailedIdsKey,
    ];
    await this.#client.sendCommand(["DEL", ...keys]);
  }
}

/**
 * Executes a specific worker role (process or insert) in the background thread using Redis streams.
 */
export class RedisQueueWorkerExecutor<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
> implements QueueWorkerExecutor<TContext, TMessage, TFinishedPayload> {
  /**
   * Runs the worker by registering the lifecycle callbacks to process incoming messages.
   *
   * @param handler - An async function or lifecycle object to process batches.
   */
  run(
    handler:
      | QueueWorkerLifecycle<TContext, TMessage, TFinishedPayload>
      | QueueWorkerLifecycle<TContext, TMessage, TFinishedPayload>["execute"],
  ): void {
    const initHook = typeof handler === "object" ? handler.init : undefined;
    const executeHook = typeof handler === "function"
      ? handler
      : handler.execute;
    const teardownHook = typeof handler === "object"
      ? handler.teardown
      : undefined;

    function log(...lines: string[]) {
      self.postMessage({
        type: WORKER_EVENTS.LOG,
        lines,
      });
    }

    self.addEventListener("message", async (event: Event) => {
      const e = event as MessageEvent;
      if (e.data?.type !== WORKER_EVENTS.INIT) return;

      const {
        redisConfig,
        workerType,
        workerMetadata,
        context,
        streamKey,
        processingStreamKey,
        failedIdsKey,
        nextStreamKey,
        consumerGroupName,
        processingGroupName,
        batchSize,
        xreadBlockDuration,
        maxRetries,
        debug,
        totalCount,
      } = e.data as WorkerInitPayload<TContext>;

      const consumerName =
        `worker-${workerMetadata.type}-${workerMetadata.index}`;
      const redis = injectRedisConnection();
      await redis.connect(redisConfig);
      const client = redis.client;

      try {
        await ensureConsumerGroup(client, streamKey, consumerGroupName);
        await initHook?.(context, { workerMetadata }, log);

        // Phase 1: Drain failed messages from failedIdsKey (claiming from PEL)
        while (true) {
          const popRes = await client.sendCommand([
            "LPOP",
            failedIdsKey,
            batchSize.toString(),
          ]);
          if (!popRes) break;
          const ids: string[] = Array.isArray(popRes)
            ? popRes.map(String)
            : [String(popRes)];
          if (ids.length === 0) break;

          const claimed = (await client.sendCommand([
            "XCLAIM",
            streamKey,
            consumerGroupName,
            consumerName,
            "0",
            ...ids,
          ])) as unknown[];

          if (!Array.isArray(claimed) || claimed.length === 0) continue;

          const batchIds: string[] = [];
          const batchData: TMessage[] = [];

          for (const msg of claimed) {
            if (!Array.isArray(msg) || msg.length < 2) continue;
            const [msgId, fields] = msg;
            batchIds.push(String(msgId));
            const dataIdx = Array.isArray(fields) ? fields.indexOf("data") : -1;
            const raw = dataIdx !== -1
              ? fields[dataIdx + 1]
              : (Array.isArray(fields) ? fields[1] : undefined);
            if (raw && typeof raw === "string") {
              batchData.push(JSON.parse(raw) as TMessage);
            }
          }

          if (batchData.length === 0) continue;

          try {
            const res = await executeHook(context, batchData, {
              retryCount: 0,
              workerMetadata,
            }, log);

            const ackCmds: string[][] = [["MULTI"]];
            for (const id of batchIds) {
              ackCmds.push(["XACK", streamKey, consumerGroupName, id]);
            }
            ackCmds.push(["EXEC"]);
            await client.pipelineCommands(ackCmds);

            const payloads = (res ?? []) as TFinishedPayload[];
            if (
              workerType === "process" && nextStreamKey && payloads.length > 0
            ) {
              const addCmds: string[][] = [["MULTI"]];
              for (const p of payloads) {
                addCmds.push([
                  "XADD",
                  nextStreamKey,
                  "*",
                  "data",
                  JSON.stringify(p),
                ]);
              }
              addCmds.push(["EXEC"]);
              await client.pipelineCommands(addCmds);
            }

            self.postMessage({
              type: workerType === "process"
                ? WORKER_EVENTS.PROCESSING_FINISHED
                : WORKER_EVENTS.INSERT_FINISHED,
              payload: payloads,
            });
          } catch (err) {
            if (debug) {
              console.error(
                `[Worker ${consumerName}] Recovered batch error:`,
                err,
              );
            }
          }
        }

        // Phase 2: Read lag from streamKey
        while (true) {
          const readRes = (await client.sendCommand([
            "XREADGROUP",
            "GROUP",
            consumerGroupName,
            consumerName,
            "COUNT",
            batchSize.toString(),
            "BLOCK",
            xreadBlockDuration.toString(),
            "STREAMS",
            streamKey,
            ">",
          ])) as unknown[];

          const hasMessages = Array.isArray(readRes) &&
            readRes.length > 0 &&
            Array.isArray(readRes[0]) &&
            Array.isArray(readRes[0][1]) &&
            readRes[0][1].length > 0;

          if (hasMessages) {
            const streamEntries =
              (readRes as [string, [string, string[]][]][])[0][1];
            const batchIds = streamEntries.map(([id]) => id);
            const batchData: TMessage[] = [];

            for (const [_, fields] of streamEntries) {
              const dataIdx = Array.isArray(fields)
                ? fields.indexOf("data")
                : -1;
              const raw = dataIdx !== -1
                ? fields[dataIdx + 1]
                : (Array.isArray(fields) ? fields[1] : undefined);
              if (raw && typeof raw === "string") {
                batchData.push(JSON.parse(raw) as TMessage);
              }
            }

            if (batchData.length > 0) {
              let success = false;
              let lastError: unknown;
              let payloads: TFinishedPayload[] = [];

              for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                  const res = await executeHook(context, batchData, {
                    retryCount: attempt,
                    workerMetadata,
                  }, log);
                  payloads = (res ?? []) as TFinishedPayload[];
                  success = true;
                  break;
                } catch (err) {
                  lastError = err;
                  if (attempt < maxRetries) {
                    await new Promise((resolve) =>
                      setTimeout(resolve, 2 ** attempt * 100)
                    );
                  }
                }
              }

              if (success) {
                const ackCmds: string[][] = [["MULTI"]];
                for (const id of batchIds) {
                  ackCmds.push(["XACK", streamKey, consumerGroupName, id]);
                }
                ackCmds.push(["EXEC"]);
                await client.pipelineCommands(ackCmds);

                if (
                  workerType === "process" && nextStreamKey &&
                  payloads.length > 0
                ) {
                  const addCmds: string[][] = [["MULTI"]];
                  for (const p of payloads) {
                    addCmds.push([
                      "XADD",
                      nextStreamKey,
                      "*",
                      "data",
                      JSON.stringify(p),
                    ]);
                  }
                  addCmds.push(["EXEC"]);
                  await client.pipelineCommands(addCmds);
                }

                self.postMessage({
                  type: workerType === "process"
                    ? WORKER_EVENTS.PROCESSING_FINISHED
                    : WORKER_EVENTS.INSERT_FINISHED,
                  payload: payloads,
                });
              } else {
                if (debug) {
                  console.error(
                    `[Worker ${consumerName}] Batch failed after retries:`,
                    lastError,
                  );
                }
              }
            }
          }

          const info = await getStreamGroupInfo(
            client,
            streamKey,
            consumerGroupName,
          );

          const allMessagesHaveBeenRead = info.lag === 0;

          if (workerType === "process") {
            const allMessagesHaveBeenStreamed = totalCount > 0
              ? info.length >= totalCount
              : !hasMessages;
            if (allMessagesHaveBeenStreamed && allMessagesHaveBeenRead) {
              break;
            }
          } else {
            const procInfo = await getStreamGroupInfo(
              client,
              processingStreamKey,
              processingGroupName,
            );
            const allProcessingMessagesHaveBeenRead = procInfo.lag === 0;
            const allInsertMessagesAreStreamed =
              info.length >=
                (procInfo.length - procInfo.pending - procInfo.lag);
            if (
              allProcessingMessagesHaveBeenRead &&
              allInsertMessagesAreStreamed && allMessagesHaveBeenRead
            ) {
              break;
            }
          }
        }
      } catch (err) {
        self.postMessage({
          type: WORKER_EVENTS.INTERRUPTED,
          error: String(err),
        });
      } finally {
        try {
          await teardownHook?.(context, { workerMetadata }, log);
        } catch {
          // ignore teardown errors
        } finally {
          self.postMessage({ type: WORKER_EVENTS.DONE });
          redis.close();
        }
      }
    });
  }
}

let _mediatorInstance:
  | RedisQueueWorkersMediator<
    unknown,
    object,
    unknown,
    unknown,
    unknown
  >
  | null = null;

/**
 * Injects a singleton instance of the RedisQueueWorkersMediator.
 *
 * @param client - An active Redis client instance.
 * @param redisConfig - Connection parameters for Redis.
 * @param options - Configuration options for Redis keys and recovery callbacks.
 * @returns The singleton instance of the mediator.
 */
export function injectRedisQueueWorkersMediator<
  TProcessingContext = unknown,
  TMessage extends object = object,
  TProcessingFinishedPayload = unknown,
  TInsertContext = unknown,
  TInsertFinishedPayload = unknown,
>(
  client: RedisClient,
  redisConfig: RedisConnectionParams,
  options: RedisQueueWorkersMediatorOptions<
    TMessage,
    TProcessingContext
  > = {},
): RedisQueueWorkersMediator<
  TProcessingContext,
  TMessage,
  TProcessingFinishedPayload,
  TInsertContext,
  TInsertFinishedPayload
> {
  if (!_mediatorInstance) {
    _mediatorInstance = new RedisQueueWorkersMediator(
      client,
      redisConfig,
      options,
    ) as unknown as RedisQueueWorkersMediator<
      unknown,
      object,
      unknown,
      unknown,
      unknown
    >;
  }
  return _mediatorInstance as unknown as RedisQueueWorkersMediator<
    TProcessingContext,
    TMessage,
    TProcessingFinishedPayload,
    TInsertContext,
    TInsertFinishedPayload
  >;
}

let _executorInstance:
  | RedisQueueWorkerExecutor<
    unknown,
    unknown,
    unknown
  >
  | null = null;

/**
 * Injects a singleton instance of the RedisQueueWorkerExecutor.
 *
 * @returns The singleton instance of the executor.
 */
export function injectRedisQueueWorkerExecutor<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
>(): RedisQueueWorkerExecutor<TContext, TMessage, TFinishedPayload> {
  if (!_executorInstance) {
    _executorInstance = new RedisQueueWorkerExecutor();
  }
  return _executorInstance as unknown as RedisQueueWorkerExecutor<
    TContext,
    TMessage,
    TFinishedPayload
  >;
}
