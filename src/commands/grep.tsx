import { FileSearch } from "lucide-react";
import { CommandModule } from "../types/command";
import { ContentSearch } from "../components/commands/ContentSearch";

const command: CommandModule = {
    meta: {
        cmd: "grep",
        title: "Search in Files",
        description: "Find text inside your files, not just in their names.",
        icon: FileSearch,
    },

    render: (query) => <ContentSearch query={query} />,

    execute: () => ({ success: true }),
};

export default command;
