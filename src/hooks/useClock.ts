import { useEffect, useState } from "react";

export function useClock() {
    const [time, setTime] = useState("");

    useEffect(() => {
        const i = setInterval(() => {
            setTime(
                new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        }, 1000);

        return () => clearInterval(i);
    }, []);

    return time;
}