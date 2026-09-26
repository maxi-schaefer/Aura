import { Palette } from "lucide-react";
import { CommandModule } from "../types/command";
import { ColorPicker } from "../components/commands/ColorPicker";

const command: CommandModule = {
    meta: {
        cmd: "color",
        title: "Color Picker",
        description: "Pick a colour from the screen and convert between hex, RGB and HSL.",
        icon: Palette,
    },

    render: (query) => <ColorPicker query={query} />,

    execute: () => ({ success: true }),
};

export default command;
