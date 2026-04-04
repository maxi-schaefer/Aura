import { matchSorter } from "match-sorter";
import { CalculatorView } from "../components/CalculatorView";
import { invoke } from "@tauri-apps/api/core";

const MAX_PER_GROUP = 30;

export function buildCalculatorResult(calculation: string | null) {
    if (!calculation) return [];

    // Format numbers with commas
    const formattedCalculation = calculation.replace(
        /(\d+)(\.\d+)?/g,
        (_, intPart, decPart) => {
            return Number(intPart).toLocaleString() + (decPart || "");
        }
    );

    return [{
        id: "calc",
        title: formattedCalculation,
        subtitle: "Calculator",
        type: "calc" as const,
        score: 1000,
        group: "Calculator",
        render: (q: string) => (
            <CalculatorView
                query={q}
                result={formattedCalculation}
                fromLabel="Input"
                toLabel="Result"
            />
        ),
        action: () => navigator.clipboard.writeText(formattedCalculation),
    }];
}

export function buildColorResult(color: string | null) {
    if (!color) return [];

    return [{
        id: "color",
        title: color,
        subtitle: "Color",
        type: "color" as const,
        score: 95,
        group: "Quick Actions",
        action: () => navigator.clipboard.writeText(color),
    }];
}

export function buildCommandResults(
    query: string,
    commands: Record<string, any>
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

export function buildAppResults(query: string, allApps: any[]) {
    const filtered = query
        ? matchSorter(allApps, query, { keys: ["name"] })
        : allApps;

    return filtered.slice(0, MAX_PER_GROUP).map((app, index) => ({
        id: app.path,
        title: app.name,
        subtitle: "Application",
        type: "app" as const,
        score: 50 - index,
        group: "Applications",
        icon: app.icon,
        action: async () => {
            await invoke("launch_app", { path: app.path });
        },
    }));
}

export function buildFileResults(fileResults: any[]) {
    return fileResults.slice(0, MAX_PER_GROUP).map((file, index) => ({
        id: file.path,
        title: file.name,
        subtitle: file.is_dir ? "Folder" : "File",
        type: "file" as const,
        score: 40 - index,
        group: "Files",
        icon: file.icon,
        action: async () => {
            await invoke("launch_app", { path: file.path });
        },
    }));
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