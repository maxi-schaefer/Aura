import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Result } from "../types/result";

type Props = {
    results: Result[];
    selectedIndex: number;
    setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
    activeCommand: Result | null;
    setActiveCommand: (cmd: Result | null) => void;
    query: string;
    setQuery: (q: string | ((q: string) => string)) => void;
    suggestion: string;
    handleExecute: () => void;
    firstRun: boolean | null;
    isLoading: boolean;
    selectedItem: Result | undefined;
    setIsInfoOpen: (fn: (v: boolean) => boolean) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    lastQuery: React.MutableRefObject<string>;
};

export function useKeyboardNavigation({
    results,
    selectedIndex,
    setSelectedIndex,
    activeCommand,
    setActiveCommand,
    query,
    setQuery,
    suggestion,
    handleExecute,
    firstRun,
    isLoading,
    selectedItem,
    setIsInfoOpen,
    inputRef,
    lastQuery,
}: Props) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (firstRun || isLoading) return;

            const max = Math.max(0, results.length - 1);

            if (!activeCommand) inputRef.current?.focus();

            if (e.ctrlKey && e.key.toLowerCase() === "k") {
                if (selectedItem) {
                    e.preventDefault();
                    setIsInfoOpen((open) => !open);
                }
                return;
            }

            if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion && !activeCommand) {
                e.preventDefault();
                setQuery((q) => q + suggestion);
                return;
            }

            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    if (activeCommand) {
                        setActiveCommand(null);
                        setQuery(lastQuery.current);
                        setSelectedIndex(0);
                    } else {
                        if (!query) getCurrentWindow().hide();
                        else {
                            setQuery("");
                            lastQuery.current = "";
                        }
                    }
                    break;

                case "Enter":
                    e.preventDefault();
                    handleExecute();
                    break;

                case "ArrowDown":
                    if (activeCommand) break;
                    e.preventDefault();
                    setSelectedIndex((i: number) => Math.min(i + 1, max));
                    break;

                case "ArrowUp":
                    if (activeCommand) break;
                    e.preventDefault();
                    setSelectedIndex((i: number) => Math.max(i - 1, 0));
                    break;

                case "Alt":
                    e.preventDefault();
                    break;
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [
        results,
        selectedIndex,
        activeCommand,
        query,
        suggestion,
        handleExecute,
        firstRun,
        isLoading,
        selectedItem,
    ]);
}