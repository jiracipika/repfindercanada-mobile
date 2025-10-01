import { Button } from "@/components/ui/button";

interface Tab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabsNavProps {
  tabs: Tab[];
  activeIndex: number;
  onTabChange: (index: number) => void;
  className?: string;
}

export function TabsNav({ tabs, activeIndex, onTabChange, className = "" }: TabsNavProps) {
  return (
    <div className={`flex items-center gap-1 bg-muted/50 rounded-lg p-1 ${className}`}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = index === activeIndex;

        return (
          <Button
            key={tab.id}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onTabChange(index)}
            className={`flex-1 gap-2 transition-all ${
              isActive ? "shadow-sm" : ""
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span className="text-xs sm:text-sm">{tab.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
