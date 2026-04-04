import { useEffect, useMemo, useState } from "react";
import { Result } from "../types/result";
import { calculateExpression, detectColor } from "../lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { loadCommands } from "../lib/command";
import { buildAliasResults, buildAppResults, buildCalculatorResult, buildColorResult, buildCommandResults, buildFallback, buildFileResults } from "../lib/resultBuilders";

export function useSearchLogic(
    activeCommandMode: boolean,
    query: string,
    allApps: any[],
    aliases: Record<string, string>
) {
    const [results, setResults] = useState<Result[]>([]);
    const [fileResults, setFileResults] = useState<any[]>([]);
    const [commands, setCommands] = useState<Record<string, any>>({});

    const calculation = useMemo(() => calculateExpression(query), [query]);
    const detectedColor = useMemo(() => detectColor(query), [query]);

    useEffect(() => {
        if (!query) return setFileResults([]);

        invoke("search_files", { query }).then((res: any) => setFileResults(res));
    }, [query]);

    useEffect(() => {
        loadCommands().then((res: any) => setCommands(res));
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