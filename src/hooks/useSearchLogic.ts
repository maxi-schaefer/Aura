import { useMemo, useState, useEffect } from 'react';
import { matchSorter } from "match-sorter";
import { calculateExpression, detectColor } from "../lib/utils";
import { COMMAND_MAP } from "../lib/command";
import { invoke } from '@tauri-apps/api/core';
import { Result } from "../types/result";

const MAX_PER_GROUP = 10;

export function useSearchLogic(query: string, allApps: any[], aliases: Record<string, string>) {
  const [results, setResults] = useState<Result[]>([]);
  const [fileResults, setFileResults] = useState<any[]>([]);

  const calculation = useMemo(() => calculateExpression(query), [query]);
  const detectedColor = useMemo(() => detectColor(query), [query]);

  // 🔹 File search (always active now)
  useEffect(() => {
    if (!query) return setFileResults([]);
    invoke("search_files", { query }).then((res: any) => setFileResults(res));
  }, [query]);

  useEffect(() => {
    const build = async () => {
      let r: Result[] = [];

      // ✅ Calculator
      if (calculation) {
        r.push({
          id: "calc",
          title: calculation,
          subtitle: "Calculator",
          type: "calc",
          action: () => navigator.clipboard.writeText(calculation),
          score: 95,
          group: "Quick Actions"
        });
      }

      // ✅ Color
      if (detectedColor) {
        r.push({
          id: "color",
          title: detectedColor,
          subtitle: "Color",
          type: "color",
          action: () => navigator.clipboard.writeText(detectedColor),
          score: 95,
          group: "Quick Actions"
        });
      }

      // ✅ Commands (NO PREFIX anymore)
      const [inputCmd, ...args] = query.toLowerCase().split(" ");
      const matchedCommands = Object.entries(COMMAND_MAP).filter(([key]) =>
          key.startsWith(inputCmd)
      );

      for (const [cmdKey, command] of matchedCommands.slice(0, MAX_PER_GROUP)) {
        const preview = command.preview?.(args);

        r.push({
            id: `command-${cmdKey}`,
            title: cmdKey,
            subtitle: preview || command.description,
            type: "command",
            group: "Commands",
            action: async () => {
                const result = await command.execute(args);

                // If result is UI → show it
                if (typeof result !== "string") {
                    setResults([
                        {
                            id: "view",
                            title: cmdKey,
                            type: "command",
                            group: "Commands",
                            view: result,
                            score: 999
                        }
                    ]);
                } else {
                    await navigator.clipboard.writeText(result);
                }
            },
            score: 100
        });
    }

      // ✅ Apps
      const filteredApps = query
        ? matchSorter(allApps, query, { keys: ["name"] })
        : allApps;

        r.push(...filteredApps.slice(0, MAX_PER_GROUP).map((app, index) => ({
            id: app.path,
            title: app.name,
            subtitle: "Application",
            type: "app" as const,
            action: async () => {
                await invoke("launch_app", { path: app.path });
            },
            score: 50 - index,
            group: "Applications"
        })));

        // ✅ Files
        r.push(...fileResults.slice(0, MAX_PER_GROUP).map((file, index) => ({
            id: file.path,
            title: file.name,
            subtitle: file.is_dir ? "Folder" : "File",
            type: "file" as const,
            action: async () => {
                await invoke("launch_app", { path: file.path });
            },
            score: 40 - index,
            group: "Files"
        })));

      // ✅ Aliases
      const aliasEntries = Object.entries(aliases);
      const filteredAliases = query ? matchSorter(aliasEntries, query.replace("@", ""), { keys: [(item) => item[0]] }) : aliasEntries;

        r.push(...filteredAliases.slice(0, MAX_PER_GROUP).map(([key, url]) => ({
          id: key,
          title: `@${key}`,
          subtitle: url,
          type: "alias" as const,
          action: async () => {
            await invoke("search_web", { query: url });
          },
          score: 80,
          group: "Aliases"
        })));

      // ✅ Fallback
      if (r.length === 0 && query.length > 0) {
        r.push({
          id: "fallback",
          title: `Search "${query}"`,
          subtitle: "Browser",
          type: "fallback",
          action: () => invoke("search_web", { query }),
          score: 10,
          group: "Search"
        });
      }

      r.sort((a, b) => b.score - a.score);
      setResults(r);
    };

    build();
  }, [query, allApps, aliases, calculation, detectedColor, fileResults]);

  return { results };
}