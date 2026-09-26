export type SpeedtestPhase = "idle" | "latency" | "download" | "upload" | "done";

export interface SpeedtestSample {
    phase: SpeedtestPhase;
    /** 0..1 through the current phase. */
    progress: number;
    latencyMs?: number;
    jitterMs?: number;
    downloadMbps?: number;
    uploadMbps?: number;
}

export interface SpeedtestResult {
    latencyMs: number;
    jitterMs: number;
    downloadMbps: number;
    uploadMbps: number;
}

/** Injected so the whole run can be exercised without a network. */
export interface SpeedtestDeps {
    fetch: typeof fetch;
    now: () => number;
}

export interface SpeedtestOptions {
    onSample: (sample: SpeedtestSample) => void;
    signal?: AbortSignal;
    deps?: Partial<SpeedtestDeps>;
}

const DOWN_URL = "https://speed.cloudflare.com/__down?bytes=";
const UP_URL = "https://speed.cloudflare.com/__up";

/** First sample pays for connection setup, so it is measured and discarded. */
const LATENCY_SAMPLES = 6;

/**
 * Time budgets rather than fixed sizes: a fast link measures more data in
 * the same wall time, and a slow one is not stuck moving hundreds of
 * megabytes. The previous implementation transferred a fixed 542 MB.
 */
const DOWNLOAD_BUDGET_MS = 8000;
const UPLOAD_BUDGET_MS = 6000;

/**
 * Hard ceilings on how much a run may move. The time budget alone is not
 * enough: on a gigabit link eight seconds is about a gigabyte, which is far
 * too much traffic for a launcher to spend on a status readout.
 */
const MAX_TOTAL_DOWNLOAD_BYTES = 100_000_000;
const MAX_TOTAL_UPLOAD_BYTES = 25_000_000;

const FIRST_CHUNK_BYTES = 1_000_000;
const MAX_CHUNK_BYTES = 25_000_000;
/** Upload chunks stay small; they are held in memory as a real buffer. */
const MAX_UPLOAD_CHUNK_BYTES = 4_000_000;

/** How much of a chunk we aim to spend per request when scaling up. */
const TARGET_CHUNK_MS = 1500;

/**
 * Network throughput is quoted in decimal megabits.
 *
 * Dividing by 1024*1024 while labelling the result Mbit/s understates the
 * speed by 4.6%, which is what the previous implementation did.
 */
export function toMegabitsPerSecond(bytes: number, seconds: number): number {
    if (seconds <= 0) return 0;
    return (bytes * 8) / (seconds * 1_000_000);
}

export function median(values: number[]): number {
    if (!values.length) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

/** Mean absolute difference between consecutive samples, as RFC 3550 does. */
export function jitter(values: number[]): number {
    if (values.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < values.length; i++) {
        total += Math.abs(values[i] - values[i - 1]);
    }
    return total / (values.length - 1);
}

/**
 * Picks the next chunk size so one request takes roughly TARGET_CHUNK_MS at
 * the speed measured so far, bounded so a fast link cannot ask for a
 * gigabyte and a slow one still makes progress.
 */
export function nextChunkSize(observedMbps: number, limit = MAX_CHUNK_BYTES): number {
    if (observedMbps <= 0) return FIRST_CHUNK_BYTES;

    const bytesPerSecond = (observedMbps * 1_000_000) / 8;
    const wanted = Math.round(bytesPerSecond * (TARGET_CHUNK_MS / 1000));

    return Math.max(FIRST_CHUNK_BYTES, Math.min(wanted, limit));
}

/**
 * Maps a throughput to 0..1 for a gauge, on a log scale.
 *
 * Linear would waste almost the whole dial: on a 0-1000 range a 50 Mbit
 * line barely leaves the origin, and most connections sit near the bottom.
 */
export function gaugeFraction(value: number, max = 1000): number {
    if (!(value > 0)) return 0;
    const clamped = Math.min(value, max);
    return Math.log10(1 + clamped) / Math.log10(1 + max);
}

function abortError(): Error {
    const error = new Error("Speed test cancelled");
    error.name = "AbortError";
    return error;
}

function ensureRunning(signal?: AbortSignal) {
    if (signal?.aborted) throw abortError();
}

async function measureLatency(
    { fetch, now }: SpeedtestDeps,
    options: SpeedtestOptions
): Promise<{ latencyMs: number; jitterMs: number }> {
    const samples: number[] = [];

    for (let i = 0; i < LATENCY_SAMPLES; i++) {
        ensureRunning(options.signal);

        const start = now();
        const response = await fetch(`${DOWN_URL}0`, {
            cache: "no-store",
            signal: options.signal,
        });
        await response.arrayBuffer();
        const elapsed = now() - start;

        // The first request also pays for DNS, TCP and TLS.
        if (i > 0) samples.push(elapsed);

        options.onSample({
            phase: "latency",
            progress: (i + 1) / LATENCY_SAMPLES,
            latencyMs: median(samples),
            jitterMs: jitter(samples),
        });
    }

    return { latencyMs: median(samples), jitterMs: jitter(samples) };
}

async function measureDownload(
    { fetch, now }: SpeedtestDeps,
    options: SpeedtestOptions
): Promise<number> {
    const started = now();
    let chunk = FIRST_CHUNK_BYTES;
    let bytes = 0;
    let seconds = 0;
    let best = 0;
    let warmedUp = false;
    let moved = 0;

    while (now() - started < DOWNLOAD_BUDGET_MS && moved < MAX_TOTAL_DOWNLOAD_BYTES) {
        ensureRunning(options.signal);

        // Never overshoot the ceiling on the final chunk.
        chunk = Math.min(chunk, MAX_TOTAL_DOWNLOAD_BYTES - moved);
        moved += chunk;

        const start = now();
        const response = await fetch(`${DOWN_URL}${chunk}`, {
            cache: "no-store",
            signal: options.signal,
        });
        const payload = await response.arrayBuffer();
        const elapsed = (now() - start) / 1000;

        const mbps = toMegabitsPerSecond(payload.byteLength, elapsed);

        // The first chunk is warm-up; it measures ramp-up, not throughput.
        if (warmedUp) {
            bytes += payload.byteLength;
            seconds += elapsed;
            best = toMegabitsPerSecond(bytes, seconds);
        } else {
            warmedUp = true;
            best = mbps;
        }

        options.onSample({
            phase: "download",
            progress: Math.min(
                Math.max(
                    (now() - started) / DOWNLOAD_BUDGET_MS,
                    moved / MAX_TOTAL_DOWNLOAD_BYTES
                ),
                1
            ),
            downloadMbps: best,
        });

        chunk = nextChunkSize(mbps);
    }

    return best;
}

async function measureUpload(
    { fetch, now }: SpeedtestDeps,
    options: SpeedtestOptions
): Promise<number> {
    const started = now();
    let chunk = FIRST_CHUNK_BYTES;
    let bytes = 0;
    let seconds = 0;
    let best = 0;
    let warmedUp = false;
    let moved = 0;

    while (now() - started < UPLOAD_BUDGET_MS && moved < MAX_TOTAL_UPLOAD_BYTES) {
        ensureRunning(options.signal);

        chunk = Math.min(chunk, MAX_TOTAL_UPLOAD_BYTES - moved);
        moved += chunk;

        const payload = new Uint8Array(chunk);
        const start = now();
        await fetch(UP_URL, {
            method: "POST",
            body: payload,
            cache: "no-store",
            signal: options.signal,
        });
        const elapsed = (now() - start) / 1000;

        const mbps = toMegabitsPerSecond(chunk, elapsed);

        if (warmedUp) {
            bytes += chunk;
            seconds += elapsed;
            best = toMegabitsPerSecond(bytes, seconds);
        } else {
            warmedUp = true;
            best = mbps;
        }

        options.onSample({
            phase: "upload",
            progress: Math.min(
                Math.max(
                    (now() - started) / UPLOAD_BUDGET_MS,
                    moved / MAX_TOTAL_UPLOAD_BYTES
                ),
                1
            ),
            uploadMbps: best,
        });

        chunk = nextChunkSize(mbps, MAX_UPLOAD_CHUNK_BYTES);
    }

    return best;
}

/**
 * Runs latency, download and upload in sequence, reporting as it goes.
 *
 * Rejects with an AbortError if the signal is aborted, so a caller that
 * navigates away does not keep transferring.
 */
export async function runSpeedtest(options: SpeedtestOptions): Promise<SpeedtestResult> {
    const deps: SpeedtestDeps = {
        fetch: options.deps?.fetch ?? globalThis.fetch.bind(globalThis),
        now: options.deps?.now ?? (() => performance.now()),
    };

    const { latencyMs, jitterMs } = await measureLatency(deps, options);
    const downloadMbps = await measureDownload(deps, options);
    const uploadMbps = await measureUpload(deps, options);

    const result = { latencyMs, jitterMs, downloadMbps, uploadMbps };

    options.onSample({ phase: "done", progress: 1, ...result });
    return result;
}
