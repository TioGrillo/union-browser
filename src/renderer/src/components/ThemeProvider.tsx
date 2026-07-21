import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";
import { themeToCssVariables } from "@/lib/themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const loadFromStore = useThemeStore((s) => s.loadFromStore);

  useEffect(() => {
    loadFromStore();
  }, [loadFromStore]);

  useEffect(() => {
    const vars = themeToCssVariables(resolvedTheme);
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    if (resolvedTheme.isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  return <>{children}</>;
}
