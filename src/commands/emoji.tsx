import { Smile } from "lucide-react";
import { CommandModule } from "../types/command";
import { EmojiPicker } from "../components/commands/EmojiPicker";

const command: CommandModule = {
    meta: {
        cmd: "emoji",
        title: "Emoji Search",
        description: "Search and copy emojis to your clipboard instantly.",
        icon: Smile,
    },

    render: (query) => <EmojiPicker query={query} />,

    execute: async (_args) => {
        return { success: true };
    }
};

export default command;