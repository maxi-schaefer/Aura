import { LucideIcon } from "lucide-react";

export type Result = {
    id: string;
    title: string;
    subtitle?: string;

    type: "app" | "file" | "alias" | "command" | "calc" | "color" | "fallback";

    action?: (runtimeArgs?: string[]) => Promise<any>;
    render?: (
        query: string,
        setConfig: (config: any) => void,
        copied?: boolean,
        config?: any
    ) => React.ReactNode;

    view?: React.ReactNode;
    width?: number;
    icon?: string | LucideIcon;

    score: number;
    group: string;
};