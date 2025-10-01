import { useLocation, Link } from "wouter";
import { Home, Heart, User, Activity } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { SafeArea } from "./safe-area";

interface NavItemProps {
  path: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ path, icon: Icon, label, isActive }) => {
  return (
    <Link href={path}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "flex flex-col h-auto w-auto p-2 gap-1 rounded-lg",
          isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Icon className={cn("h-5 w-5", isActive && "scale-105 transition-transform duration-200")} />
        <span className={cn("text-xs font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
          {label}
        </span>
      </Button>
    </Link>
  );
};

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/saved", icon: Heart, label: "Saved" },
    { path: "/activity", icon: Activity, label: "Activity" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <SafeArea bottom className="fixed inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur-lg border-t">
      <nav className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} isActive={location === item.path} />
        ))}
      </nav>
    </SafeArea>
  );
}
