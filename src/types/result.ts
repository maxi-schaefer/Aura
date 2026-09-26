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
    /** Backend items carry Option<String>, so null is a real value here. */
    icon?: string | LucideIcon | null;

    score: number;
    group: string;
};