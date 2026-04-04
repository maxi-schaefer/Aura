import { CloudSun } from "lucide-react";
import { CommandModule } from "../types/command";
import { WeatherCard } from "../components/commands/WeatherCard";

const command: CommandModule = {
    meta: {
        cmd: "weather",
        title: "Weather",
        description: "View current weather conditions and forecasts for any location.",
        icon: CloudSun,
    },

    render: (query) => <WeatherCard city={query} />,

    execute: async (args) => args.join(" ") || ""
};

export default command;