import { matchSorter } from "match-sorter";
import { CalculatorView } from "../components/CalculatorView";
import { invoke } from "@tauri-apps/api/core";
import { AppItem, FileItem } from "../types/system";
import { Command } from "../types/command";
import { CalculationResult } from "./calculator";
import { nameOf, parseColor } from "./color";

const MAX_PER_GROUP = 30;

export function buildCalculatorResult(calculation: CalculationResult | null) {
    if (!calculation) return [];

    return [{
        id: "calc",
        title: calculation.display,
        subtitle: "Calculator",
        type: "calc" as const,
        score: 1000,
        group: "Calculator",
        // CalculatorView formats what it is given, so hand it the raw value.
        render: (q: string) => (
            <CalculatorView
                query={q}
                result={calculation.raw}
                fromLabel="Input"
                toLabel="Result"
            />
        ),
        // Copy the canonical value, not the locale-formatted one.
        action: () => navigator.clipboard.writeText(calculation.raw),
    }];
}

export function buildColorResult(color: string | null) {
    if (!color) return [];

    const parsed = parseColor(color);
    const name = parsed ? nameOf(parsed) : null;

    return [{
        id: "color",
        title: color,
        subtitle: name ? `Color · ${name}` : "Color",
        type: "color" as const,
        score: 95,
        group: "Quick Actions",
        action: () => navigator.clipboard.writeText(color),
    }];
}

export function buildCommandResults(
    query: string,
    commands: Record<string, Command>
) {
    const [inputCmd, ...args] = query.toLowerCase().split(" ");

    return Object.entries(commands)
        .filter(([key]) => key.includes(inputCmd))
        .slice(0, MAX_PER_GROUP)
        .map(([cmdKey, command]) => ({
            id: `command-${cmdKey}`,
            title: command.title || cmdKey,
            subtitle: command.description,
            type: "command" as const,
            group: "Commands",
            icon: command.icon,
            render: command.render,
            score: 100,
            action: async (runtimeArgs?: string[]) => {
                const finalArgs =
                    runtimeArgs && runtimeArgs.length > 0
                        ? runtimeArgs
                        : args;

                const result = await command.execute(finalArgs);

                if (typeof result === "string") {
                    await navigator.clipboard.writeText(result);
                }

                return result;
            },
        }));
}

/**
 * Apps and files differ only in how they are labelled and ranked; both
 * resolve to a path that the backend launches.
 */
function buildLaunchableResults<T extends { name: string; path: string; icon?: string | null }>(
    items: T[],
    options: {
        type: "app" | "file";
        group: string;
        baseScore: number;
        subtitle: (item: T) => string;
    }
) {
    return items.slice(0, MAX_PER_GROUP).map((item, index) => ({
        id: item.path,
        title: item.name,
        subtitle: options.subtitle(item),
        type: options.type,
        score: options.baseScore - index,
        group: options.group,
        icon: item.icon,
        action: async () => {
            await invoke("launch_app", { path: item.path });
        },
        actions: [
            {
                modifier: "shift" as const,
                label: "Reveal",
                run: () => invoke("reveal_in_explorer", { path: item.path }),
            },
            // Elevation only makes sense for something executable.
            ...(options.type === "app"
                ? [
                      {
                          modifier: "ctrl" as const,
                          label: "Run as admin",
                          run: () => invoke("launch_app_elevated", { path: item.path }),
                      },
                  ]
                : []),
        ],
    }));
}

export function buildAppResults(query: string, allApps: AppItem[]) {
    const filtered = query
        ? matchSorter(allApps, query, { keys: ["name"] })
        : allApps;

    return buildLaunchableResults(filtered, {
        type: "app",
        group: "Applications",
        baseScore: 50,
        subtitle: () => "Application",
    });
}

export function buildFileResults(fileResults: FileItem[]) {
    return buildLaunchableResults(fileResults, {
        type: "file",
        group: "Files",
        baseScore: 40,
        subtitle: (file) => (file.is_dir ? "Folder" : "File"),
    });
}

export function buildAliasResults(query: string, aliases: Record<string, string>) {
    const entries = Object.entries(aliases);

    const filtered = query
        ? matchSorter(entries, query.replace("@", ""), {
              keys: [(item) => item[0]],
          })
        : entries;

    return filtered.slice(0, MAX_PER_GROUP).map(([key, url]) => ({
        id: key,
        title: `@${key}`,
        subtitle: url,
        type: "alias" as const,
        score: 80,
        group: "Aliases",
        action: async () => {
            await invoke("search_web", { query: url });
        },
    }));
}

export function buildFallback(query: string, results: any[]) {
    if (results.length > 0 || !query) return [];

    return [{
        id: "fallback",
        title: `Search "${query}"`,
        subtitle: "Browser",
        type: "fallback" as const,
        score: 10,
        group: "Search",
        action: () => invoke("search_web", { query }),
    }];
}