// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import DashboardContainer from "@/components/DashboardContainer"; // Corrected import
import TextbookSelector from "@/components/TextbookSelector";
import AuthForm from "@/components/AuthForm";
import UserProfile from "@/components/UserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
// Toaster is likely in layout.tsx
// import { Toaster } from "@/components/ui/toaster";

// Import UserData type from the correct location
import type { UserData } from '@/types/dashboard';

const LOGIN_STATUS_KEY = 'app_login_status';
const USER_DATA_KEY = 'app_user_data';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [selectedChapterContent, setSelectedChapterContent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("9");

  const [startPageNum, setStartPageNum] = useState<number | undefined>(undefined);
  const [endPageNum, setEndPageNum] = useState<number | undefined>(undefined);

  useEffect(() => {
    const loggedInStatus = localStorage.getItem(LOGIN_STATUS_KEY);
    const storedUserData = localStorage.getItem(USER_DATA_KEY);

    if (loggedInStatus === 'true' && storedUserData) {
      try {
        const parsedData: UserData = JSON.parse(storedUserData);
        setIsLoggedIn(true);
        setUserData(parsedData);
        console.log("User restored from local storage:", parsedData);
      } catch (e) {
        console.error("Failed to parse user data from local storage", e);
        localStorage.removeItem(LOGIN_STATUS_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        setIsLoggedIn(false);
        setUserData(null);
      }
    } else {
      setIsLoggedIn(false);
      setUserData(null);
    }
    setIsLoadingAuth(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: UserData) => {
    if (!loggedInUser) return;
    console.log("Handling login success:", loggedInUser);
    localStorage.setItem(LOGIN_STATUS_KEY, 'true');
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(loggedInUser));
    setUserData(loggedInUser);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    console.log("Handling logout");
    localStorage.removeItem(LOGIN_STATUS_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    setIsLoggedIn(false);
    setUserData(null);
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AuthForm setIsLoggedIn={handleLoginSuccess} />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen relative">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <Image src="/logo.png" alt="Logo" width={36} height={36} />
          <div className="flex-1"></div>
          <UserProfile user={userData} onLogout={handleLogout} />
        </header>

        <aside className="w-full md:w-1/3 lg:w-1/4 xl:w-1/5 p-6 md:p-8 border-b md:border-b-0 md:border-r dark:border-slate-700/50 md:h-screen md:overflow-y-auto flex flex-col gap-6 md:gap-8">
          <div className="hidden md:flex items-center justify-between pb-4 border-b dark:border-slate-700/50 shrink-0">
            <Image src="/logo.png" alt="Logo" width={40} height={40} priority />
            <UserProfile user={userData} onLogout={handleLogout} />
          </div>
          <div className="flex-grow min-h-0">
            <TextbookSelector
              setSelectedChapterContent={setSelectedChapterContent}
              setSelectedSubject={setSelectedSubject}
              setSelectedGrade={setSelectedGrade}
              setStartPageNum={setStartPageNum}
              setEndPageNum={setEndPageNum}
            />
          </div>
          {selectedChapterContent && (
            <Card className="mt-auto shrink-0 hidden md:block bg-card/80 backdrop-blur-sm border dark:border-slate-700/50">
              <CardHeader className="p-3 px-4">
                <CardTitle className="text-sm font-medium">Selected Content</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[150px] xl:h-[200px] w-full border-t dark:border-slate-700/50 p-2 bg-muted/40 dark:bg-muted/50">
                  <pre className="whitespace-pre-wrap text-xs font-mono">{selectedChapterContent}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </aside>

        <main className="w-full md:flex-1 p-6 md:p-10 xl:p-12 md:h-screen md:overflow-y-auto pb-28 md:pb-10">
          {/* ** CORRECTED: Pass userId to DashboardContainer ** */}
          <DashboardContainer
            chapterContent={selectedChapterContent}
            subject={selectedSubject}
            grade={selectedGrade}
            startPage={startPageNum}
            endPage={endPageNum}
            userId={userData?.id} // Pass the user ID (could be id, phone_number, etc. based on UserData type)
          />
        </main>

        <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center items-center z-20 md:justify-end md:pr-10 lg:pr-16 xl:pr-20 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
          <Button
            size="lg"
            asChild
            variant="outline"
            className="bg-card/95 backdrop-blur-sm shadow-lg border border-border/70 pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
          >
            <a href="https://t.me/grade9to12ethiopia" target="_blank" rel="noopener noreferrer">
              Join our Telegram Channel
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}
