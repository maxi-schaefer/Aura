import { useEffect, RefObject } from 'react';
import { getCurrentWindow, LogicalPosition, LogicalSize, primaryMonitor } from '@tauri-apps/api/window';

export function useWindowShadow(containerRef: RefObject<HTMLDivElement | null>, dependencies: any[]) {
    useEffect(() => {
        const update = async () => {
            if (!containerRef.current) return;
            const monitor = await primaryMonitor();
            if (!monitor) return;

            const { height } = containerRef.current.getBoundingClientRect();
            const win = getCurrentWindow();
            const logicalSize = new LogicalSize(700, Math.ceil(height));
            
            await win.setSize(logicalSize);
            const monitorSize = monitor.size.toLogical(monitor.scaleFactor);
            const x = (monitorSize.width / 2) - 350;
            const y = monitorSize.height * 0.25;
            await win.setPosition(new LogicalPosition(x, y));
        };

        const observer = new ResizeObserver(() => requestAnimationFrame(update));
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, dependencies);
}