export async function loadCommands() {
    const modules = import.meta.glob("../commands/*.tsx");

    const entries = await Promise.all(
        Object.entries(modules).map(async ([_path, loader]) => {
            const mod: any = await loader();
            return mod.default;
        })
    );

    const map: Record<string, any> = {};

    for (const cmd of entries) {
        map[cmd.meta.cmd] = {
        ...cmd.meta,
            render: cmd.render,
            execute: cmd.execute,
        };
    }

    return map;
}