import { CommandWrapper } from "./CommandWrapper";

export const PasswordCard = ({ length, value, copied }: any) => (
  <CommandWrapper copied={copied} meshColor="bg-purple-500/20">
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Security Tool</span>
        <span className="text-white/30 text-xs">{length} characters</span>
      </div>
      <div className="bg-black/20 p-4 rounded-xl border border-white/5 font-mono text-xl text-white break-all tracking-wider text-center">
        {value || "••••••••••••"}
      </div>
      <p className="text-center text-white/40 text-[11px]">Press <span className="text-white">Enter</span> to regenerate and copy</p>
    </div>
  </CommandWrapper>
);