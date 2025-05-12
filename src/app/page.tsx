// src/app/page.tsx
"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import DashboardContainer from "@/components/DashboardContainer"; 
import TextbookSelector from "@/components/TextbookSelector";
import AuthForm from "@/components/AuthForm"; 
import UserProfile from "@/components/UserProfile"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
// Toaster should be in layout.tsx
// import { Toaster } from "@/components/ui/toaster";

type UserData = {
  id?: string | number; // From your Vercel Postgres 'users' table schema
  fullName?: string;
  gradeLevel?: string;
  phoneNumber?: string;
  is_confirmed?: boolean; // From your Vercel Postgres 'users' table schema
  registered_at?: string; // From your Vercel Postgres 'users' table schema
} | null;

const LOGIN_STATUS_KEY = 'app_login_status_v3'; // Increment version if data structure changes
const USER_DATA_KEY = 'app_user_data_v3';

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
        if (parsedData && parsedData.phoneNumber) { 
            setIsLoggedIn(true); setUserData(parsedData);
        } else { throw new Error("Stored user data is invalid."); }
      } catch (e) {
        console.error("Auth Check: Failed to parse/validate localStorage data", e);
        localStorage.removeItem(LOGIN_STATUS_KEY); localStorage.removeItem(USER_DATA_KEY);
        setIsLoggedIn(false); setUserData(null);
      }
    } else { setIsLoggedIn(false); setUserData(null); }
    setIsLoadingAuth(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: UserData) => {
      if (!loggedInUser || !loggedInUser.phoneNumber) { 
          console.warn("handleLoginSuccess called with incomplete user data:", loggedInUser);
          return; 
      }
      console.log("Page: Login Succeeded for:", loggedInUser.phoneNumber, "Setting states and localStorage.");
      localStorage.setItem(LOGIN_STATUS_KEY, 'true');
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(loggedInUser));
      setUserData(loggedInUser); 
      setIsLoggedIn(true); // This is the crucial state update that should trigger re-render
  };

  const handleLogout = () => {
    localStorage.removeItem(LOGIN_STATUS_KEY); localStorage.removeItem(USER_DATA_KEY);
    setIsLoggedIn(false); setUserData(null);
  };

  if (isLoadingAuth) {
      return ( <div className="flex justify-center items-center min-h-screen bg-background"> <p className="text-lg text-muted-foreground animate-pulse">Loading Application...</p> </div> );
  }

  if (!isLoggedIn) {
    // *** CORRECTED PROP NAME ***
    return ( <AuthForm onLoginSuccess={handleLoginSuccess} /> ); 
  }

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen relative bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card/80 dark:bg-card/90 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-card/60 md:hidden dark:border-slate-700/50">
             <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="StudySmart Logo" width={32} height={32} className="rounded-sm"/>
                <span className="font-semibold text-md text-foreground">StudySmart</span>
             </div>
             <UserProfile user={userData} onLogout={handleLogout} />
        </header>

        <aside className="w-full md:w-[320px] lg:w-[350px] xl:w-[380px] p-4 sm:p-6 border-b md:border-b-0 md:border-r dark:border-slate-700/50 md:h-screen md:overflow-y-auto flex flex-col gap-6 shrink-0 bg-card md:bg-transparent print:hidden">
            <div className="hidden md:flex items-center justify-between pb-4 border-b dark:border-slate-700/50 shrink-0">
                 <div className="flex items-center gap-3">
                    <Image src="/logo.png" alt="StudySmart Logo" width={38} height={38} priority className="rounded-md"/>
                    <span className="font-bold text-xl text-foreground">StudySmart</span>
                 </div>
                 <UserProfile user={userData} onLogout={handleLogout} />
            </div>
            <div className="flex-grow min-h-0">
             <TextbookSelector
                // These direct setters are fine if TextbookSelector is simple and doesn't need more control
                setSelectedChapterContent={setSelectedChapterContent}
                setSelectedSubject={setSelectedSubject}
                setSelectedGrade={setSelectedGrade}
                setStartPageNum={setStartPageNum}
                setEndPageNum={setEndPageNum}
                // Optional: Pass current values if TextbookSelector needs to be a controlled component
                // currentSubject={selectedSubject}
                // currentGrade={selectedGrade}
             />
            </div>
           {selectedChapterContent && (
            <Card className="mt-auto shrink-0 hidden md:block bg-muted/30 dark:bg-muted/20 border-none shadow-inner">
              <CardHeader className="p-3 px-4 border-b dark:border-slate-700/60">
                <CardTitle className="text-sm font-medium text-foreground/80">Selected Text Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[100px] xl:h-[130px] w-full p-3">
                  <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground">{selectedChapterContent.substring(0, 400)}{selectedChapterContent.length > 400 ? '...' : ''}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </aside>

        <main className="w-full md:flex-1 p-3 py-5 sm:p-6 md:p-8 xl:p-10 md:h-screen md:overflow-y-auto pb-24 md:pb-8 print:p-0 print:m-0 print:overflow-visible print:h-auto">
          <DashboardContainer
            key={`${selectedSubject}-${selectedGrade}-${startPageNum}-${endPageNum}-${selectedChapterContent.length}`}
            chapterContent={selectedChapterContent}
            subject={selectedSubject}
            grade={selectedGrade}
            startPage={startPageNum}
            endPage={endPageNum}
          />
        </main>

        <div className="fixed bottom-0 left-0 right-0 p-3 px-4 border-t md:border-t-0 flex justify-center items-center z-20 md:justify-end md:pb-4 md:pr-8 lg:pr-12 xl:pr-16 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 md:bg-transparent md:backdrop-blur-none pointer-events-none print:hidden">
              <Button size="lg" asChild variant="outline" className="shadow-lg border-border/70 pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-colors duration-200 text-sm sm:text-base bg-card">
                  <a href="https://t.me/grade9to12ethiopia" target="_blank" rel="noopener noreferrer"> Join our Telegram Channel </a>
              </Button>
        </div>
      </div>
    </>
  );
}
