import { Gauge } from "lucide-react";
import { CommandModule } from "../types/command";
import { SpeedtestResult } from "../components/commands/SpeedtestResult";

const command: CommandModule = {
    meta: {
        cmd: "speedtest",
        title: "Speedtest",
        description: "Test your internet connection speed.",
        icon: Gauge
    },

    render: () => <SpeedtestResult />,
    
    execute: () => ({ success: true }),
};

export default command;