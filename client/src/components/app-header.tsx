import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Preferences } from "@capacitor/preferences";
import { Landmark, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { iconSwap } from "./civic/motion";

const THEME_KEY = "theme";
type Theme = "dark" | "light" | "system";

export default function AppHeader() {
  const [theme, setTheme] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(true);

  const applyTheme = (value: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = value === "dark" || (value === "system" && prefersDark);
    setIsDark(dark);
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
  };

  useEffect(() => {
    let currentTheme: Theme = "system";
    Preferences.get({ key: THEME_KEY })
      .then(({ value }) => {
        currentTheme = (value as Theme) || "system";
        setTheme(currentTheme);
        applyTheme(currentTheme);
      })
      .catch(() => {
        // Preferences unavailable (e.g. storage blocked) — fall back to system theme
        applyTheme(currentTheme);
      });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (currentTheme === "system") applyTheme("system");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const onToggle = async () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      await Preferences.set({ key: THEME_KEY, value: next });
    } catch {
      // Persistence is best-effort; the in-session theme is already applied
    }
  };

  return (
    <header
      className="civic-glass relative z-30 border-b border-border"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="relative mx-auto flex h-11 max-w-screen-md items-center justify-between px-2">
        <div
          className="civic-maple-mark"
          style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.375rem" }}
          aria-hidden="true"
        >
          <Landmark className="h-4 w-4" strokeWidth={2} />
        </div>

        <h1 className="text-headline absolute left-1/2 -translate-x-1/2 truncate text-foreground">
          RepFinder Canada
        </h1>

        <Button
          variant="ghost"
          size="icon"
          aria-label={isDark ? "Use light appearance" : "Use dark appearance"}
          onClick={onToggle}
          className="h-11 w-11 shrink-0 rounded-full text-primary"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? "moon" : "sun"}
              className="flex"
              variants={iconSwap}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {isDark ? <Moon className="h-[22px] w-[22px]" strokeWidth={1.8} /> : <Sun className="h-[22px] w-[22px]" strokeWidth={1.8} />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </header>
  );
}
