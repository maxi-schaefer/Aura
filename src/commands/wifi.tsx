import { WifiCog } from "lucide-react";
import { CommandModule } from "../types/command";
import { WifiScanner } from "../components/commands/WifiScanner";

const command: CommandModule = {
    meta: {
        cmd: "wifi",
        title: "Wifi Explorer",
        description: "Scan nearby WiFi networks and visualize signal strength and congestion.",
        icon: WifiCog
    },

    render: () => <WifiScanner />,
    
    execute: () => ({ success: true }),
};

export default command;