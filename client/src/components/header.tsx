import { Button } from "@/components/ui/button";
import { Building, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="bg-primary text-white shadow-lg sticky top-0 z-50 safe-area-top">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Find My Rep</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-primary-dark p-2 rounded-full"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
