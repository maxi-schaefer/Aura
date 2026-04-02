import { useEffect, RefObject } from 'react';
import { getCurrentWindow, LogicalPosition, LogicalSize, primaryMonitor } from '@tauri-apps/api/window';

export function useWindowShadow(
    containerRef: RefObject<HTMLDivElement | null>, 
    isExpanded: boolean,
    isFirstRun: boolean, // Added this parameter
    dependencies: any[]
) {
    useEffect(() => {
        const update = async () => {
            if (!containerRef.current) return;
            const monitor = await primaryMonitor();
            if (!monitor) return;

            const win = getCurrentWindow();
            let targetWidth: number;
            let targetHeight: number;

            if (isFirstRun) {
                targetWidth = 1000;
                targetHeight = 650;
            } else {
                const { height } = containerRef.current.getBoundingClientRect();
                targetWidth = isExpanded ? 1250 : 1000;
                targetHeight = Math.ceil(height);
            }

            const logicalSize = new LogicalSize(targetWidth, targetHeight);
            await win.setSize(logicalSize);
            
            const monitorSize = monitor.size.toLogical(monitor.scaleFactor);
            const x = (monitorSize.width / 2) - (targetWidth / 2);
            
            const y = isFirstRun 
                ? (monitorSize.height / 2) - (targetHeight / 2)
                : monitorSize.height * 0.25;

            await win.setPosition(new LogicalPosition(x, y));
        };

        const observer = new ResizeObserver(() => requestAnimationFrame(update));
        if (containerRef.current) observer.observe(containerRef.current);
        
        // Initial run
        update();

        return () => observer.disconnect();
    }, [isExpanded, isFirstRun, ...dependencies]);
}