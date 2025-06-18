import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, Heart, User } from "lucide-react";
import { Link } from "wouter";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/saved", icon: Heart, label: "Saved" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-2 z-40 safe-area-bottom">
      <div className="flex justify-around items-center">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors touch-manipulation ${
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-neutral-500 hover:text-primary hover:bg-primary/5"
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
