import { useLocation, Link } from "wouter";
import { Clock3, Heart, MapPinned, UserRound } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface NavItemProps {
  path: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ path, icon: Icon, label, isActive }) => (
  <Link href={path} className="flex-1" aria-current={isActive ? "page" : undefined}>
    <Button
      variant="ghost"
      className={cn(
        "civic-nav-item flex h-auto w-full flex-col gap-0.5 px-2 py-1.5 text-muted-foreground",
        isActive && "text-primary",
      )}
      data-active={isActive}
    >
      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
      <span className="text-[10px] font-bold tracking-wide">{label}</span>
    </Button>
  </Link>
);

export function BottomNav() {
  const [location] = useLocation();
  const navItems = [
    { path: "/", icon: MapPinned, label: "Find" },
    { path: "/saved", icon: Heart, label: "Saved" },
    { path: "/activity", icon: Clock3, label: "History" },
    { path: "/profile", icon: UserRound, label: "Profile" },
  ];

  return (
    <div className="civic-nav-shell">
      <nav className="flex items-center justify-around" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} isActive={location === item.path} />
        ))}
      </nav>
    </div>
  );
}
