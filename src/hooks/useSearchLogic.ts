import { useMemo, useState, useEffect } from 'react';
import { matchSorter } from "match-sorter";
import { calculateExpression, detectColor } from "../lib/utils";
import { COMMAND_MAP } from "../lib/command";
import { invoke } from '@tauri-apps/api/core';

export function useSearchLogic(query: string, allApps: any[], aliases: Record<string, string>) {
    const [commandResult, setCommandResult] = useState<string | null>(null);
    const [fileResults, setFileResults] = useState<any[]>([]);

    const calculation = useMemo(() => calculateExpression(query), [query]);
    const detectedColor = useMemo(() => detectColor(query), [query]);

    const filteredApps = useMemo(() => 
        query ? matchSorter(allApps, query, { keys: ["name"] }) : allApps
    , [query, allApps]);

    const filteredAliases = useMemo(() => {
        if (!query.startsWith("@")) return [];
        const term = query.slice(1).toLowerCase();
        return Object.entries(aliases).filter(([key]) => key.includes(term));
    }, [query, aliases]);

    const suggestion = useMemo(() => {
        if (!query.startsWith(">")) return "";
        const part = query.slice(1).trimStart().toLowerCase();
        if (!part) return "";
        return Object.keys(COMMAND_MAP).find(cmd => cmd.startsWith(part)) || "";
    }, [query]);

    useEffect(() => {
        if (query.startsWith("/")) {
            const fileQuery = query.slice(1);
            invoke("search_files", { query: fileQuery }).then((res: any) => {
                setFileResults(res);
            });
        } else {
            setFileResults([]);
        }
    }, [query]);

    // Handle Async Commands
    useEffect(() => {
        if (query.startsWith(">")) {
            const rawContent = query.slice(1).trim();
            const [cmdPrefix, ...args] = rawContent.split(" ");
            const command = COMMAND_MAP[cmdPrefix];
            if (command) {
                Promise.resolve(command.execute(args)).then(setCommandResult);
            } else { setCommandResult(null); }
        } else { setCommandResult(null); }
    }, [query]);

    return { calculation, detectedColor, filteredApps, filteredAliases, suggestion, commandResult, fileResults };
}