// src/components/UserProfile.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { Button } from '@/components/ui/button';
import { LogOut, GraduationCap, Phone, BarChart3, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react'; // Added RefreshCw
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
import type { UserData } from '@/types/dashboard';

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

interface PerformanceAPIResponse {
    success: boolean;
    logs?: PerformanceLog[];
    currentPage?: number;
    pageSize?: number;
    totalLogs?: number;
    totalPages?: number;
    message?: string;
}

interface UserProfileProps {
  user: UserData | null;
  onLogout: () => void;
}

const PAGE_SIZE = 10; // Match API or allow API to dictate

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const [performanceLogs, setPerformanceLogs] = useState<PerformanceLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [showPerformance, setShowPerformance] = useState(false);

  const fetchLogs = useCallback(async (pageToFetch: number, append = false) => {
    if (!user?.id) return;

    setIsLoadingLogs(true);
    setLogsError(null); // Clear previous errors
    try {
      const response = await fetch(`/api/get-performance-logs?id=${user.id}&page=${pageToFetch}&pageSize=${PAGE_SIZE}`);
      const data: PerformanceAPIResponse = await response.json();

      if (response.ok && data.success && data.logs) {
        setPerformanceLogs(prevLogs => append ? [...prevLogs, ...data.logs!] : data.logs!);
        setCurrentPage(data.currentPage || 1);
        setTotalPages(data.totalPages || 1);
        setTotalLogsCount(data.totalLogs || 0);
      } else {
        setLogsError(data.message || "Failed to load performance data.");
        if (!append) setPerformanceLogs([]); // Clear if it's a fresh load attempt
      }
    } catch (error) {
      console.error("Error fetching performance logs:", error);
      setLogsError("Connection error fetching performance data.");
      if (!append) setPerformanceLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [user?.id]); // Dependency on user.id

  // Effect to fetch initial logs when performance section is opened or user changes
  useEffect(() => {
    if (user?.id && showPerformance) {
      setPerformanceLogs([]); // Clear previous logs before fetching new set
      setCurrentPage(1);      // Reset to page 1
      fetchLogs(1, false);    // Fetch page 1, don't append
    } else if (!showPerformance) {
      setPerformanceLogs([]); // Clear logs if user closes the section
      setCurrentPage(1);
      setTotalPages(1);
    }
  }, [user?.id, showPerformance, fetchLogs]); // fetchLogs is now stable due to useCallback

  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoadingLogs) {
      fetchLogs(currentPage + 1, true); // Fetch next page and append
    }
  };

  const handleRefresh = () => {
      if (user?.id && showPerformance) {
          setPerformanceLogs([]);
          setCurrentPage(1);
          fetchLogs(1, false);
      }
  }


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

  const canLoadMore = currentPage < totalPages;

  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) setShowPerformance(false); }}>
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
            <div className="flex justify-between items-center px-2 pt-1 pb-0.5">
                <DropdownMenuLabel className="text-xs p-0 font-normal text-muted-foreground">
                    Recent Scores ({performanceLogs.length} of {totalLogsCount})
                </DropdownMenuLabel>
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoadingLogs} className="h-6 w-6 text-muted-foreground hover:text-primary">
                    <RefreshCw className={cn("h-3 w-3", isLoadingLogs && "animate-spin")} />
                </Button>
            </div>
            <DropdownMenuGroup>
              {isLoadingLogs && performanceLogs.length === 0 && ( // Show main loader only if no logs are displayed yet
                <DropdownMenuItem disabled className="flex justify-center text-xs py-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading performance...
                </DropdownMenuItem>
              )}
              {logsError && !isLoadingLogs && performanceLogs.length === 0 && ( // Show error only if no logs and not loading
                <DropdownMenuItem disabled className="text-xs text-destructive text-center py-2 px-3">
                  {logsError}
                </DropdownMenuItem>
              )}
              {!isLoadingLogs && !logsError && performanceLogs.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground text-center py-2">
                  No performance data recorded yet.
                </DropdownMenuItem>
              )}

              {performanceLogs.length > 0 && (
                <ScrollArea className="max-h-[180px] pr-1"> {/* Adjusted max height for load more button */}
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
                                style={{ width: `${Math.max(2, Math.min(100, log.score))}%` }} // Ensure width is between 2 and 100
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

              {/* Load More Button / Loading More Indicator */}
              {canLoadMore && !isLoadingLogs && (
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()} // Prevent closing menu
                  className="focus:bg-transparent"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    className="w-full mt-1.5 text-xs"
                  >
                    Load More ({totalLogsCount - performanceLogs.length} remaining)
                  </Button>
                </DropdownMenuItem>
              )}
              {isLoadingLogs && performanceLogs.length > 0 && ( // Show "loading more" if logs are already displayed
                 <DropdownMenuItem disabled className="flex justify-center text-xs py-2">
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading more...
                </DropdownMenuItem>
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
