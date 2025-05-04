// src/components/UserProfile.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, GraduationCap, Phone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Use Avatar for initial

// Define the type for user data passed as props
interface UserProfileProps {
  user: {
    fullName?: string;
    gradeLevel?: string;
    phoneNumber?: string;
  } | null; // Allow user to be null initially
  onLogout: () => void; // Function to handle logout
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  if (!user) {
    // Optional: Render a placeholder or nothing if user data isn't loaded yet
    return null;
  }

  // Get initials for Avatar fallback
  const getInitials = (name?: string) => {
      if (!name) return '?';
      const names = name.split(' ');
      if (names.length === 1) return names[0][0]?.toUpperCase() || '?';
      return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
         {/* Use Avatar for a cleaner look */}
         <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
             <Avatar className="h-9 w-9">
                {/* Placeholder for a user image if you add one later */}
                {/* <AvatarImage src="/path/to/user-image.jpg" alt={user.fullName || 'User'} /> */}
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {getInitials(user.fullName)}
                </AvatarFallback>
             </Avatar>
         </Button>

        {/* Original Button Style (alternative)
        <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full">
          <UserCircle className="h-4 w-4" />
          <span className="hidden md:inline">{user.fullName || 'User'}</span>
        </Button>
        */}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.fullName || 'User Name'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.phoneNumber || 'Phone Number'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
         {user.gradeLevel && (
            <DropdownMenuItem className="cursor-default">
                 <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                 <span>Grade: {user.gradeLevel}</span>
            </DropdownMenuItem>
         )}
         <DropdownMenuItem onClick={onLogout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
