import { useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "theme"; // "dark" | "light" | "system"

type Theme = "dark" | "light" | "system";

export default function AppHeader() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: THEME_KEY });
      const initial = (value as Theme) || "system";
      setTheme(initial);
      applyTheme(initial);
    })();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const applyTheme = (val: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = val === "dark" || (val === "system" && prefersDark);
    root.classList.toggle("dark", isDark);
  };

  const onToggle = async () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    await Preferences.set({ key: THEME_KEY, value: next });
  };

  return (
    <header className="bg-background">
      <div
        className="px-4 flex items-end justify-between pb-3"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          minHeight: 'calc(3.5rem + env(safe-area-inset-top))'
        }}
      >
        <h1 className="text-lg sm:text-xl font-bold text-foreground">
          Rep Finder
        </h1>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle dark mode"
          onClick={onToggle}
          className="h-10 w-10 rounded-full"
        >
          {theme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
