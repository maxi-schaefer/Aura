export type Result = {
    id: string;
    title: string;
    subtitle?: string;

    type: "app" | "file" | "alias" | "command" | "calc" | "color" | "fallback";

    action?: () => void | Promise<any>;
    render?: (args: string) => any;

    // Raycast-style detail view
    view?: React.ReactNode;
    width?: number;

    score: number;
    group: string;
};