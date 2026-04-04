import { DiscAlbumIcon } from "lucide-react";
import { CommandModule } from "../types/command";
import { NowPlayingCard } from "../components/commands/NowPlayingCard";

const command: CommandModule = {
    meta: {
        cmd: "nowplaying",
        title: "Now Playing",
        description: "View and control your currently playing media.",
        icon: DiscAlbumIcon
    },

    render: () => <NowPlayingCard />,
    
    execute: () => ({ success: true }),
};

export default command;