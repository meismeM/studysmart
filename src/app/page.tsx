"use client";

import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import Dashboard from "@/components/Dashboard";
import AuthForm from "@/components/AuthForm";
import { useState } from "react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <SidebarProvider>
      {isLoggedIn ? <Dashboard /> : <AuthForm setIsLoggedIn={setIsLoggedIn} />}
      <Toaster />
    </SidebarProvider>
  );
}
