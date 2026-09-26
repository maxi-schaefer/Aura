import { getCurrentWindow } from "@tauri-apps/api/window";
import { Result, ResultModifier } from "../types/result";

type UseExecutionProps = {
    results: Result[];
    selectedIndex: number;
    activeCommand: Result | null;
    query: string;
    setQuery: (q: string) => void;
    setActiveCommand: (cmd: Result | null) => void;
    triggerCopied: () => void;
    lastQuery: React.MutableRefObject<string>;
};

export function useExecution({
    results,
    selectedIndex,
    activeCommand,
    query,
    setQuery,
    setActiveCommand,
    triggerCopied,
    lastQuery,
}: UseExecutionProps) {
    return async (modifier?: ResultModifier) => {
        if (activeCommand) {
            const result = await activeCommand.action?.([query]);
            if (result?.success) triggerCopied();
            return;
        }

        const current = results[selectedIndex];
        if (!current) return;

        if (modifier) {
            const action = current.actions?.find((a) => a.modifier === modifier);
            // Nothing bound to this modifier: do nothing rather than falling
            // through to the default action, which would surprise the user.
            if (!action) return;

            try {
                await action.run();
            } catch (e) {
                console.error(`Action "${action.label}" failed`, e);
                return;
            }

            if (!action.keepOpen) {
                setQuery("");
                getCurrentWindow().hide();
            }
            return;
        }

        if (!current.action) return;

        if (current.type === "command") {
            lastQuery.current = query;

            const result = await current.action();
            setActiveCommand(current);
            setQuery("");

            if (result?.success) triggerCopied();
            return;
        }

        await current.action();
        setQuery("");
        getCurrentWindow().hide();
    };
}