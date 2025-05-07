// src/components/UserProfile.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, GraduationCap, Phone } from 'lucide-react'; // Removed UserCircle as Avatar is used
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Define the expected structure of the user prop, allowing for snake_case
interface UserProfileData {
  fullName?: string;    // Frontend state might use this
  full_name?: string;   // API/DB might return this
  gradeLevel?: string;  // Frontend state might use this
  grade_level?: string; // API/DB might return this
  phoneNumber?: string; // Frontend state might use this
  phone_number?: string;// API/DB might return this
  // Add other potential fields like id, registered_at if needed
}

interface UserProfileProps {
  user: UserProfileData | null; // Use the more specific type
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  // Log the received prop for debugging
  console.log("UserProfile received user:", user);

  // Handle the case where user data is not yet available or invalid
  if (!user || (!user.phoneNumber && !user.phone_number)) {
    console.log("UserProfile: Rendering null or placeholder because user prop is null or missing essential data.");
    // Optionally return a placeholder/login button, or null to render nothing
    return null;
    // Or return a simple placeholder:
    // return <div className="text-sm text-muted-foreground">Loading user...</div>;
  }

  // ** FIX: Access properties using both camelCase and snake_case with fallbacks **
  const displayName = user.fullName || user.full_name || 'User';
  const displayPhone = user.phoneNumber || user.phone_number || 'No phone';
  const displayGrade = user.gradeLevel || user.grade_level; // Will be undefined if neither exists

  // Get initials function - robustly handles undefined/null/empty names
  const getInitials = (name?: string): string => {
      if (!name || name.trim() === '') return '?';
      const names = name.trim().split(' ');
      const firstInitial = names[0][0]?.toUpperCase();
      // Find last part of the name that isn't empty
      const lastPart = names.findLast(n => n.length > 0);
      const lastInitial = lastPart?.[0]?.toUpperCase();

      if (names.length === 1 || !lastInitial) return firstInitial || '?';
      return `${firstInitial}${lastInitial}`;
  }
  const initials = getInitials(displayName);


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
         <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
             <Avatar className="h-9 w-9">
                {/* Add AvatarImage here if you implement profile pictures */}
                {/* <AvatarImage src={user.avatarUrl} alt={displayName} /> */}
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                    {initials}
                </AvatarFallback>
             </Avatar>
         </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end" forceMount> {/* Slightly wider */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {/* Display Name */}
            <p className="text-sm font-medium leading-none truncate" title={displayName}>
                {displayName}
            </p>
            {/* Display Phone */}
            <p className="text-xs leading-none text-muted-foreground">
              <Phone className="inline-block mr-1.5 h-3 w-3 align-middle text-muted-foreground/80"/>
              {displayPhone}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
         {/* Display Grade if available */}
         {displayGrade && (
            <DropdownMenuItem className="cursor-default focus:bg-transparent"> {/* Make non-interactive */}
                 <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground/80" />
                 <span className="text-xs">Grade: {displayGrade}</span>
            </DropdownMenuItem>
         )}
         {/* Logout Button */}
         <DropdownMenuItem onClick={onLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
