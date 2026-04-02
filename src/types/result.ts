import { LucideIcon } from "lucide-react";

export type Result = {
    id: string;
    title: string;
    subtitle?: string;

    type: "app" | "file" | "alias" | "command" | "calc" | "color" | "fallback";

    action?: () => void | Promise<any>;
    render?: (args: string) => any;

    view?: React.ReactNode;
    width?: number;
    icon?: string | LucideIcon;

    score: number;
    group: string;
};