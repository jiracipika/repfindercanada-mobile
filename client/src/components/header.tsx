import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Building, Menu, Home, User, Heart, Info, Shield, FileText, MessageSquare } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Browser } from '@capacitor/browser';
import { isPlatform } from '@ionic/react';

const BASE_WEB_URL = "https://canadarepfinder.vercel.app";

const openExternal = async (url: string) => {
  const fullUrl = url.startsWith('http') ? url : `${BASE_WEB_URL}${url}`;
  if (isPlatform('capacitor')) {
    await Browser.open({ url: fullUrl });
  } else {
    window.open(fullUrl, '_blank');
  }
};

export function Header() {
  const [location] = useLocation();

  const menuItems = [
    { path: "/saved", icon: Heart, label: "Saved", type: "internal" as const },
    { path: "/profile", icon: User, label: "Profile", type: "internal" as const },
    { path: "/sources-disclaimer", icon: Info, label: "Sources & Disclaimers", type: "internal" as const },
    { path: "/privacy", icon: Shield, label: "Privacy Policy", type: "external" as const },
    { path: "/terms", icon: FileText, label: "Terms of Service", type: "external" as const },
  ];

  return (
    <header className="safe-pt px-4 pb-2 sticky top-0 backdrop-blur supports-[backdrop-filter]:bg-background/70 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 active:bg-white/20 p-3 rounded-full transition-all duration-200 touch-manipulation">
                  <Home className="h-6 w-6" />
                </Button>
              </Link>
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Find My Rep</h1>
                <p className="text-blue-100 text-xs">Canadian Parliament</p>
              </div>
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/10 active:bg-white/20 p-3 rounded-full transition-all duration-200 touch-manipulation"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  {menuItems.map((item) => (
                    item.type === "internal" ? (
                      <Link href={item.path} key={item.path}>
                        <Button variant="outline" className="w-full justify-start">
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        key={item.path}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => openExternal(item.path)}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    )
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
  );
}
