import { cn } from "@/lib/utils";

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#64748b",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={cn(
            "w-7 h-7 rounded-lg transition-all duration-150 border-2",
            value === color
              ? "border-white scale-110 shadow-lg"
              : "border-transparent hover:scale-105"
          )}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}
