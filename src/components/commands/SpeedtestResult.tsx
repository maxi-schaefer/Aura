import { useCallback, useEffect, useRef, useState } from "react";
import { SpeedtestCard } from "./SpeedtestCard";
import { SpeedtestPhase, SpeedtestSample, runSpeedtest } from "../../lib/speedtest";

interface State {
    phase: SpeedtestPhase;
    progress: number;
    latencyMs: number;
    jitterMs: number;
    downloadMbps: number;
    uploadMbps: number;
    error: string | null;
}

const INITIAL: State = {
    phase: "idle",
    progress: 0,
    latencyMs: 0,
    jitterMs: 0,
    downloadMbps: 0,
    uploadMbps: 0,
    error: null,
};

export const SpeedtestResult = () => {
    const [state, setState] = useState<State>(INITIAL);
    const controller = useRef<AbortController | null>(null);

    const start = useCallback(() => {
        // Replace any run still in flight rather than racing it.
        controller.current?.abort();
        const current = new AbortController();
        controller.current = current;

        setState({ ...INITIAL, phase: "latency" });

        const apply = (sample: SpeedtestSample) => {
            if (current.signal.aborted) return;

            setState((prev) => ({
                ...prev,
                phase: sample.phase,
                progress: sample.progress,
                latencyMs: sample.latencyMs ?? prev.latencyMs,
                jitterMs: sample.jitterMs ?? prev.jitterMs,
                downloadMbps: sample.downloadMbps ?? prev.downloadMbps,
                uploadMbps: sample.uploadMbps ?? prev.uploadMbps,
            }));
        };

        runSpeedtest({ onSample: apply, signal: current.signal }).catch((e: unknown) => {
            // Aborting is how we stop a run; it is not a failure to report.
            if (current.signal.aborted) return;

            console.error("Speed test failed", e);
            setState((prev) => ({
                ...prev,
                phase: "done",
                progress: 1,
                error:
                    e instanceof Error
                        ? `Could not reach the test server. ${e.message}`
                        : "Could not reach the test server.",
            }));
        });
    }, []);

    useEffect(() => {
        start();
        // Leaving the command must stop the transfer, not let it run on.
        return () => controller.current?.abort();
    }, [start]);

    return <SpeedtestCard {...state} onRestart={start} />;
};
