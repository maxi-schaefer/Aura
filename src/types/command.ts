import { LucideIcon } from "lucide-react";

/** Static descriptor a command module declares about itself. */
export interface CommandMeta {
    cmd: string;
    title: string;
    description: string;
    icon?: LucideIcon;
}

export type CommandRender = (
    query: string,
    setConfig: (config: any) => void,
    copied?: boolean,
    config?: any
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
