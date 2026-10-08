import { useLocation, Link } from "wouter";
import { Clock3, Heart, MapPinned, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticSelectionChanged } from "@/lib/native-shell";

interface NavItemProps {
  path: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}

/**
 * Real iOS tab bar item: icon + label, selection is a plain color
 * cross-fade. No sliding pill, no icon pop, no overlay decoration —
 * the link area itself receives every tap.
 */
const NavItem: React.FC<NavItemProps> = ({ path, icon: Icon, label, isActive }) => (
  <Link
    href={path}
    className="flex-1"
    aria-current={isActive ? "page" : undefined}
    onClick={() => {
      if (!isActive) hapticSelectionChanged();
    }}
  >
    <span
      className={cn(
        "civic-nav-item flex w-full flex-col items-center justify-center gap-[3px] px-2 pt-1 text-muted-foreground transition-colors duration-150",
        isActive && "text-primary",
      )}
      data-active={isActive}
    >
      <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </span>
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
      <nav className="flex h-[49px] items-stretch justify-around" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} isActive={location === item.path} />
        ))}
      </nav>
    </div>
  );
}
