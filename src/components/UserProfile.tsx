// src/components/UserProfile.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, GraduationCap, Phone, BarChart3, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { UserData } from '@/types/dashboard'; // UserData type should have 'id'

interface PerformanceLog {
  log_id: number;
  score: number;
  subject: string | null;
  grade: string | null;
  quiz_type: string;
  questions_total: number | null;
  questions_correct: number | null;
  timestamp: string;
}

interface UserProfileProps {
  user: UserData | null;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const [performanceLogs, setPerformanceLogs] = useState<PerformanceLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [showPerformance, setShowPerformance] = useState(false);

  // Log the user prop when it changes or component mounts
  useEffect(() => {
    console.log("UserProfile received user prop:", user);
  }, [user]);

  useEffect(() => {
    // Log inside useEffect to see what `user.id` is when attempting fetch
    console.log("UserProfile useEffect for fetching logs, user?.id:", user?.id, "showPerformance:", showPerformance);
    if (user?.id && showPerformance) {
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
        setLogsError(null);
        try {
          // Use 'id' as the query parameter name
          const response = await fetch(`/api/get-performance-logs?id=${user.id}`);
          const data = await response.json();
          if (response.ok && data.success) {
            setPerformanceLogs(data.logs || []);
          } else {
            setLogsError(data.message || "Failed to load performance data.");
            setPerformanceLogs([]);
          }
        } catch (error) {
          console.error("Error fetching performance logs:", error);
          setLogsError("Connection error fetching performance data.");
          setPerformanceLogs([]);
        } finally {
          setIsLoadingLogs(false);
        }
      };
      fetchLogs();
    } else if (!showPerformance) {
        setPerformanceLogs([]);
    }
  }, [user?.id, showPerformance]);

  if (!user) {
    return null;
  }

  const displayName = user.fullName || user.full_name || 'User';
  const displayPhone = user.phoneNumber || user.phone_number || 'No phone';
  const displayGrade = user.gradeLevel || user.grade_level;

  const getInitials = (name?: string): string => {
      if (!name || name.trim() === '') return '?';
      const names = name.trim().split(' ');
      const firstInitial = names[0]?.[0]?.toUpperCase();
      const lastPart = names.findLast(n => n.length > 0);
      const lastInitial = lastPart?.[0]?.toUpperCase();
      if (!firstInitial) return '?';
      if (names.length === 1 || !lastInitial) return firstInitial;
      return `${firstInitial}${lastInitial}`;
  }
  const initials = getInitials(displayName);

  const getScoreBarColor = (score: number): string => {
    if (score >= 80) return "bg-green-500 dark:bg-green-600";
    if (score >= 50 && score < 80) return "bg-yellow-500 dark:bg-yellow-600";
    return "bg-red-500 dark:bg-red-600";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
         <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
             <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                    {initials}
                </AvatarFallback>
             </Avatar>
         </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 md:w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate" title={displayName}>
                {displayName}
            </p>
            {displayPhone !== 'No phone' && (
                <p className="text-xs leading-none text-muted-foreground">
                <Phone className="inline-block mr-1.5 h-3 w-3 align-middle text-muted-foreground/80"/>
                {displayPhone}
                </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
         {displayGrade && (
            <DropdownMenuItem className="cursor-default focus:bg-transparent text-xs">
                 <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground/80" />
                 <span>Grade: {displayGrade}</span>
            </DropdownMenuItem>
         )}
         <DropdownMenuSeparator />

        <DropdownMenuItem
            onClick={(e) => { e.preventDefault(); setShowPerformance(!showPerformance); }}
            className="cursor-pointer text-sm items-center"
        >
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>My Performance</span>
            {showPerformance ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>

        {showPerformance && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {isLoadingLogs && (
                <DropdownMenuItem disabled className="flex justify-center text-xs py-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading performance...
                </DropdownMenuItem>
              )}
              {logsError && !isLoadingLogs && (
                <DropdownMenuItem disabled className="text-xs text-destructive text-center py-2 px-3">
                  {logsError}
                </DropdownMenuItem>
              )}
              {!isLoadingLogs && !logsError && performanceLogs.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground text-center py-2">
                  No performance data recorded yet.
                </DropdownMenuItem>
              )}
              {!isLoadingLogs && !logsError && performanceLogs.length > 0 && (
                <ScrollArea className="max-h-[200px] pr-1">
                  {performanceLogs.map((log) => (
                    <DropdownMenuItem key={log.log_id} className="flex flex-col items-start !p-2.5 focus:bg-accent/50 cursor-default">
                      <div className="flex justify-between w-full mb-1.5">
                        <span className="text-xs font-medium truncate max-w-[60%]">
                          {log.subject || "Quiz"} {log.grade ? `(G${log.grade})` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center w-full gap-2">
                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden border border-border/30">
                            <div
                                className={cn("h-full rounded-l-full transition-all duration-300", getScoreBarColor(log.score))}
                                style={{ width: `${Math.max(2, log.score)}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right tabular-nums">{log.score.toFixed(0)}%</span>
                      </div>
                      { (log.questions_correct !== null && log.questions_total !== null && log.questions_total > 0) &&
                         <div className="text-[10px] text-muted-foreground/80 mt-1">
                            Scored: {log.questions_correct} / {log.questions_total}
                         </div>
                      }
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              )}
            </DropdownMenuGroup>
          </>
        )}

         <DropdownMenuSeparator />
         <DropdownMenuItem onClick={onLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
