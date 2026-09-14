/**
 * Build the Express app. Kept separate from the process entry points so the
 * same app can run standalone (index.ts) or combined with the workers (main.ts).
 */
export declare function createApp(): import("express-serve-static-core").Express;
