import { LucideIcon } from "lucide-react";

export interface CommandModule {
    meta: {
        cmd: string;
        title: string;
        description: string;
        icon?: LucideIcon;
    };

    render?: (
        query: string,
        setConfig: (config: any) => void,
        copied?: boolean,
        config?: any
    ) => React.ReactNode;

    execute: (args: string[]) => any | Promise<any>;
}

export interface Command {
    cmd: string;
    title: string;
    description: string;
    icon?: LucideIcon;

    render?: (
        query: string,
        setConfig: (config: any) => void,
        copied?: boolean,
        config?: any
    ) => React.ReactNode;
    
    execute: (args: string[]) => any | Promise<any>;
}