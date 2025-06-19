import { Button } from "@/components/ui/button";
import { Building, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="safe-area-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Find My Rep</h1>
                <p className="text-blue-100 text-xs">Canadian Parliament</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/10 active:bg-white/20 p-3 rounded-full transition-all duration-200 touch-manipulation"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
