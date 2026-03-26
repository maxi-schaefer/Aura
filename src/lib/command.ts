export interface Command {
    cmd: string;          // e.g., "b64"
    description: string;     // Shown in UI
    execute: (args: string[]) => string | Promise<string>;
}

export const COMMAND_MAP: Record<string, Command> = {
  b64: {
    cmd: "b64",
    description: "Auto Base64: > b64 [text]",
    execute: (args) => {
      const input = args.join(" ");
      if (!input) return "Enter text to encode or decode...";

      try {
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(input);
        
        if (isBase64) {
          const decoded = atob(input);
          const isPrintable = /^[\x20-\x7E\r\n\t]*$/.test(decoded);
          
          if (isPrintable && decoded.length > 0) {
            return decoded; 
          }
        }
        return btoa(input);
      } catch (e) {
        return btoa(input);
      }
    },
  },
};