import { Command, CommandModule } from "../types/command";

/**
 * Loads every module in src/commands and flattens each one into a Command,
 * keyed by the `cmd` it declares in its meta.
 */
export async function loadCommands(): Promise<Record<string, Command>> {
    const modules = import.meta.glob<{ default: CommandModule }>(
        "../commands/*.tsx"
    );

    const loaded = await Promise.all(
        Object.values(modules).map(async (load) => (await load()).default)
    );

    return Object.fromEntries(
        loaded.map(({ meta, render, execute }) => [
            meta.cmd,
            { ...meta, render, execute },
        ])
    );
}
