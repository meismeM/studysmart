"use client";

import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <SidebarProvider>
      <Dashboard />
      <Toaster />
    </SidebarProvider>
  );
}
