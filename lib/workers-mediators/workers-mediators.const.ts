/**
 * Constant identifiers for tracking worker events between the main thread
 * and individual processing or insertion workers.
 */
export const WORKER_EVENTS = {
  /** Sent from the main thread to a worker to initialize the first contact and transfer its readable stream. */
  INIT: "init",
  /** Sent from a processing worker to the main thread indicating task completion. */
  PROCESSING_FINISHED: "processingFinished",
  /** Sent from the insertion worker to the main thread indicating successful insertion. */
  INSERT_FINISHED: "insertFinished",
  /** Sent from a worker to indicate it has finished a batch (internal over port). */
  FINISHED: "finished",
  /** Sent from a worker to indicate it has completely finished its execution loop. */
  DONE: "done",
  /** Sent from a worker to indicate it has been interrupted by an error. */
  INTERRUPTED: "interrupted",
  /** Sent from the workers to the mediator to forward the console logs from the workers */
  LOG: "log",
} as const;

/** Default number of retries before a worker job fails completely. */
export const DEFAULT_MAX_RETRIES = 3;

/** Default number of processing workers to spawn. */
export const DEFAULT_PROCESSING_WORKERS_COUNT = 2;
