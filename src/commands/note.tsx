import { NotebookPen } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { CommandModule } from "../types/command";
import { Scratchpad } from "../components/commands/Scratchpad";

const command: CommandModule = {
    meta: {
        cmd: "note",
        title: "Scratchpad",
        description: "A quick note that saves as you type.",
        icon: NotebookPen,
        args: [
            {
                name: "text",
                description: "Text to append, or leave empty to just open it",
                rest: true,
            },
        ],
    },

    render: () => <Scratchpad />,

    // Text typed before entering the command is captured straight away, so
    // "note buy milk" appends without the view ever being opened by hand.
    execute: async (args) => {
        const text = args.join(" ").trim();
        if (text) await invoke("append_note", { text });

        // Deliberately not { success: true }: that drives the "copied"
        // indicator, which would be the wrong feedback here.
        return {};
    },
};

export default command;
