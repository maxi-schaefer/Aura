import { Sparkles } from "lucide-react";
import { CommandModule } from "../types/command";
import { AskAi } from "../components/commands/AskAi";

const command: CommandModule = {
    meta: {
        cmd: "ask",
        title: "Ask AI",
        description: "Ask Claude, OpenAI or Gemini without leaving Aura.",
        icon: Sparkles,
        args: [
            {
                name: "question",
                description: "What do you want to ask?",
                required: true,
                rest: true,
            },
        ],
    },

    render: (query, _setConfig, _copied, config) => (
        <AskAi query={query} config={config} />
    ),

    execute: () => ({}),
};

export default command;
