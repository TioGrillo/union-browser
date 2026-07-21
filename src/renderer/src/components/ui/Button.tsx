import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all active:scale-[0.98]",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-accent text-white hover:bg-accent-light shadow-sm",
        variant === "secondary" && "bg-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border))]",
        variant === "danger" && "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20",
        variant === "ghost" && "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border))]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
