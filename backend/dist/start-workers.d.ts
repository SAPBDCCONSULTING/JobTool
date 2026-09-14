export interface RunningWorkers {
    close: () => Promise<void>;
}
/**
 * Start all background workers + register the repeatable schedules.
 * Shared by the standalone worker entry (worker.ts) and the combined
 * API + workers entry (main.ts).
 */
export declare function startWorkers(): Promise<RunningWorkers>;
