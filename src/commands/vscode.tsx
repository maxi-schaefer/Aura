import { Code2 } from "lucide-react";
import { CommandModule } from "../types/command";
import { VsCodeProjects } from "../components/commands/VsCodeProjects";

const command: CommandModule = {
    meta: {
        cmd: "code",
        title: "VS Code Projects",
        description: "Reopen a recent VS Code folder or workspace.",
        icon: Code2,
    },

    render: (query) => <VsCodeProjects query={query} />,

    execute: () => ({ success: true }),
};

export default command;
