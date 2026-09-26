import { LucideIcon } from "lucide-react";

/** A parameter a command accepts after its name. */
export interface CommandArgument {
    name: string;
    /** Shown as the input placeholder while the command is active. */
    description?: string;
    required?: boolean;
    default?: string;
    /** Swallows the remainder of the query, spaces included. Must be last. */
    rest?: boolean;
}

/** Static descriptor a command module declares about itself. */
export interface CommandMeta {
    cmd: string;
    title: string;
    description: string;
    icon?: LucideIcon;
    /** Declared positionally; parsed by lib/commandArgs. */
    args?: CommandArgument[];
}

export type CommandRender = (
    query: string,
    setConfig: (config: any) => void,
    copied?: boolean,
    config?: any,
    /** The query split across the command's declared arguments. */
    args?: Record<string, string>
) => React.ReactNode;

export type CommandExecute = (args: string[]) => any | Promise<any>;

/** What a command does, independent of how it describes itself. */
export interface CommandBehaviour {
    render?: CommandRender;
    execute: CommandExecute;
}

/** Default export of every file in src/commands. */
export interface CommandModule extends CommandBehaviour {
    meta: CommandMeta;
}

/** A loaded command: its meta flattened alongside its behaviour. */
export type Command = CommandMeta & CommandBehaviour;
