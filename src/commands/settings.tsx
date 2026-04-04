import { Settings } from "lucide-react";
import { SettingsView } from "../components/commands/SettingsView";
import { CommandModule } from "../types/command";

const command: CommandModule = {
    meta: {
        cmd: "settings",
        title: "Settings",
        description: "Configure application preferences and customize your experience.",
        icon: Settings
    },

    render: (query, setConfig, _copied, config) => <SettingsView query={query} config={config} setConfig={setConfig} />,
    
    execute: () => ({ success: true }),
};

export default command;