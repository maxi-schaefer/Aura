import { useEffect, useMemo, useState } from "react";
import { Result } from "../types/result";
import { calculateExpression, detectColor } from "../lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { loadCommands } from "../lib/command";
import { buildAliasResults, buildAppResults, buildCalculatorResult, buildColorResult, buildCommandResults, buildFallback, buildFileResults } from "../lib/resultBuilders";
import { AppItem, FileItem } from "../types/system";
import { Command } from "../types/command";

export function useSearchLogic(
    activeCommandMode: boolean,
    query: string,
    allApps: AppItem[],
    aliases: Record<string, string>
) {
    const [results, setResults] = useState<Result[]>([]);
    const [fileResults, setFileResults] = useState<FileItem[]>([]);
    const [commands, setCommands] = useState<Record<string, Command>>({});

    const calculation = useMemo(() => calculateExpression(query), [query]);
    const detectedColor = useMemo(() => detectColor(query), [query]);

    useEffect(() => {
        if (!query) return setFileResults([]);

        invoke<FileItem[]>("search_files", { query }).then(setFileResults);
    }, [query]);

    useEffect(() => {
        loadCommands().then(setCommands);
    }, []);

    useEffect(() => {
        if (activeCommandMode) return;

        let r: Result[] = [];

        r.push(...buildCalculatorResult(calculation));
        r.push(...buildColorResult(detectedColor));
        r.push(...buildCommandResults(query, commands));
        r.push(...buildAppResults(query, allApps));
        r.push(...buildFileResults(fileResults));
        r.push(...buildAliasResults(query, aliases));
        r.push(...buildFallback(query, r));

        r.sort((a, b) => b.score - a.score);

        setResults(r);
    }, [
        query,
        allApps,
        aliases,
        calculation,
        detectedColor,
        fileResults,
        commands,
        activeCommandMode,
    ]);

    return { results };
}