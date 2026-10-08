import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Preferences } from "@capacitor/preferences";
import { Landmark, Moon, ShieldCheck, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { iconSwap, springSnappy } from "./civic/motion";

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
    <header className="civic-glass relative z-30 border-x-0 border-t-0">
      <div
        className="mx-auto flex max-w-screen-md items-end justify-between gap-3 px-4 pb-3"
        style={{
          paddingTop: "max(.7rem, env(safe-area-inset-top))",
          minHeight: "calc(4rem + env(safe-area-inset-top))",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="civic-maple-mark" aria-hidden="true">
            <Landmark className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                RepFinder Canada
              </h1>
              <ShieldCheck
                className="h-4 w-4 text-[var(--civic-mint)]"
                aria-label="Sources linked for verification"
              />
            </div>
            <p className="truncate text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
              Independent civic tool
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label={isDark ? "Use light appearance" : "Use dark appearance"}
          onClick={onToggle}
          className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-card/70"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? "moon" : "sun"}
              className="flex"
              variants={iconSwap}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={springSnappy}
            >
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </header>
  );
}
