"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="bg-secondary rounded-md p-2"
          aria-label="Toggle theme"
        >
          <Icons.light className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Icons.dark className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" forceMount>
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <Icons.light className="mr-2 h-4 w-4"/>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <Icons.dark className="mr-2 h-4 w-4"/>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
           <Icons.settings className="mr-2 h-4 w-4"/>
          System
        </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("calm-blue")}>
            <span className="mr-2 h-4 w-4 bg-calm-blue rounded-full inline-block"></span>
            Calm Blue
          </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
