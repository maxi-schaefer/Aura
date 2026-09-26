import { LucideIcon } from "lucide-react";

/** Modifier held alongside Enter (or a click) to run a secondary action. */
export type ResultModifier = "ctrl" | "shift";

/** An alternative to a result's default action. */
export interface ResultAction {
    modifier: ResultModifier;
    /** Shown as a hint on the highlighted row. */
    label: string;
    run: () => Promise<unknown>;
    /** Whether the launcher should close afterwards. Defaults to true. */
    keepOpen?: boolean;
}

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

    /** Secondary actions, reached by holding a modifier. */
    actions?: ResultAction[];

    score: number;
    group: string;
};