import { CommandArgument } from "../types/command";

export interface ParsedArguments {
    /** Values by argument name; absent arguments fall back to their default. */
    values: Record<string, string>;
    /** Names of required arguments the query did not supply. */
    missing: string[];
    /** True when every required argument has a value. */
    complete: boolean;
}

const EMPTY: ParsedArguments = { values: {}, missing: [], complete: true };

/**
 * Splits a query across a command's declared arguments, positionally.
 *
 * An argument marked `rest` swallows everything left, spaces included, so
 * it must be the last one declared.
 */
export function parseArguments(
    args: CommandArgument[] | undefined,
    query: string
): ParsedArguments {
    if (!args?.length) return EMPTY;

    const tokens = query.trim().split(/\s+/).filter(Boolean);
    const values: Record<string, string> = {};
    const missing: string[] = [];

    let cursor = 0;

    for (const arg of args) {
        const isLast = arg === args[args.length - 1];
        const remaining = tokens.slice(cursor);

        let value = "";
        if (arg.rest || isLast) {
            // The final argument takes the remainder so multi-word values
            // such as a city or a search phrase survive intact.
            value = arg.rest ? remaining.join(" ") : remaining[0] ?? "";
            if (arg.rest) cursor = tokens.length;
            else if (remaining.length) cursor += 1;
        } else {
            value = remaining[0] ?? "";
            if (remaining.length) cursor += 1;
        }

        if (!value && arg.default !== undefined) value = arg.default;

        if (value) values[arg.name] = value;
        else if (arg.required) missing.push(arg.name);
    }

    return { values, missing, complete: missing.length === 0 };
}

/** "weather <city>" — required in angle brackets, optional in square. */
export function formatUsage(cmd: string, args?: CommandArgument[]): string {
    if (!args?.length) return cmd;

    const parts = args.map((arg) =>
        arg.required ? `<${arg.name}>` : `[${arg.name}]`
    );

    return `${cmd} ${parts.join(" ")}`;
}

/** Placeholder text for the input once a command is active. */
export function argumentPlaceholder(args?: CommandArgument[]): string | null {
    if (!args?.length) return null;

    const first = args[0];
    if (first.description) return first.description;

    return args
        .map((arg) => (arg.required ? `<${arg.name}>` : `[${arg.name}]`))
        .join(" ");
}
