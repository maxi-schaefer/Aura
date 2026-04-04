import { AlarmClock } from "lucide-react";
import { TimerCard } from "../components/commands/TimerCard";
import { parseTimerString } from "../lib/utils";

const command = {
    meta: {
        cmd: "timer",
        title: "Timer",
        description: "Start, pause, or manage countdown timers using natural time inputs.",
        icon: AlarmClock,
    },

    render: (query: string) => {
        const totalSeconds = parseTimerString(query);
        return <TimerCard initialSeconds={totalSeconds} />;
    },

    execute: async (args: string[]) => {
        const totalSeconds = parseTimerString(args.join(""));
        if (totalSeconds <= 0) return { success: false };

        window.dispatchEvent(
            new CustomEvent("timer-action", {
                detail: { type: "start", totalSeconds },
            })
        );

        return { success: true };
    },
};

export default command;