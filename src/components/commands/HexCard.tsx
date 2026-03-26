import { CommandWrapper } from "./CommandWrapper";

export const HexCard = ({ input, result, copied }: any) => (
  <CommandWrapper copied={copied} meshColor="bg-emerald-500/20">
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Hex Converter</span>
      <div className="grid grid-cols-1 gap-2">
        <div className="text-[10px] text-white/30 uppercase">Input</div>
        <div className="text-white/80 font-medium truncate">{input || "Waiting for text..."}</div>
        <div className="h-[1px] bg-white/5 my-1" />
        <div className="text-[10px] text-white/30 uppercase">Output</div>
        <div className="text-emerald-400 font-mono break-all">{result}</div>
      </div>
    </div>
  </CommandWrapper>
);