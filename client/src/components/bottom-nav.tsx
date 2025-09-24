import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, Heart, User, Info } from "lucide-react"; // Import Info icon
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-40 safe-area-bottom">
      <div className="grid grid-cols-4 w-full">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <div
                className={`flex flex-col items-center py-2 px-1 transition-all duration-200 touch-manipulation relative ${
                  isActive 
                    ? "text-blue-600" 
                    : "text-gray-500 active:text-blue-600 active:scale-95"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-blue-50 rounded-2xl scale-110" />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <Icon className={`h-6 w-6 mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                  <span className={`text-xs font-medium transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                    {label}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
