import { Download } from "lucide-react";
import { CommandModule } from "../types/command";
import { WingetManager } from "../components/commands/WingetManager";

const command: CommandModule = {
    meta: {
        cmd: "install",
        title: "Winget Manager",
        description: "Search, install, and manage Windows packages using Winget.",
        icon: Download,
        args: [{ name: "package", description: "Package to search for", rest: true }]
    },

    render: (query) => <WingetManager query={query} />,

    execute: async () => { return { success: true }; }
};

export default command;