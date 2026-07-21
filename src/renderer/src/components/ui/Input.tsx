import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-[rgb(var(--text-muted))]">{label}</label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl text-sm text-[rgb(var(--text-primary))]",
          "placeholder:text-[rgb(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
          "transition-all",
          error && "border-red-500/50 focus:ring-red-500/30",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
