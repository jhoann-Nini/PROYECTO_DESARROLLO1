"use client";

interface SearchBarProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Buscar productos...",
}: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-700 bg-black/90 py-3.5 pl-4 pr-12 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none focus:ring-2 focus:ring-[#d71920]/30 shadow-2xl transition-all"
      />
    </div>
  );
}
