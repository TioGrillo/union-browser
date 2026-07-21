import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: SelectOption[];
  className?: string;
}

export function Select({ value, onChange, options, className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value == value) || options[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1.5 bg-[rgb(var(--bg-surface))] border rounded-lg text-sm transition-colors focus:outline-none",
          isOpen ? "border-accent text-[rgb(var(--text-primary))]" : "border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:border-[rgb(var(--border))]"
        )}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown size={14} className={cn("text-[rgb(var(--text-faint))] transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center px-3 py-2 text-sm transition-colors text-left",
                value == opt.value
                  ? "bg-accent text-white"
                  : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
