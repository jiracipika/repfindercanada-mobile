import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
