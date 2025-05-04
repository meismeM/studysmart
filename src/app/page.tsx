// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Dashboard from "@/components/Dashboard";
import TextbookSelector from "@/components/TextbookSelector";
import AuthForm from "@/components/AuthForm";
import UserProfile from "@/components/UserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is imported if not global

// Define user data type
type UserData = {
  fullName?: string;
  gradeLevel?: string;
  phoneNumber?: string;
} | null;

const LOGIN_STATUS_KEY = 'app_login_status'; // Key for local storage
const USER_DATA_KEY = 'app_user_data'; // Key for user data

export default function Home() {
  // --- State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start loading

  const [selectedChapterContent, setSelectedChapterContent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("9"); // Default grade

  // ** ADDED: State for page numbers in the parent **
  const [startPageNum, setStartPageNum] = useState<number | undefined>(undefined);
  const [endPageNum, setEndPageNum] = useState<number | undefined>(undefined);


  // --- Check Login Status on Load ---
  useEffect(() => {
    const loggedInStatus = localStorage.getItem(LOGIN_STATUS_KEY);
    const storedUserData = localStorage.getItem(USER_DATA_KEY);

    if (loggedInStatus === 'true' && storedUserData) {
      try {
        const parsedData = JSON.parse(storedUserData);
        setIsLoggedIn(true);
        setUserData(parsedData);
        console.log("User restored from local storage.");
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
    setIsLoadingAuth(false); // Finished check
  }, []); // Empty dependency array means run only once on mount

  // --- Login Handler ---
  const handleLoginSuccess = (loggedInUser: UserData) => {
      if (!loggedInUser) return;
      console.log("Handling login success:", loggedInUser);
      localStorage.setItem(LOGIN_STATUS_KEY, 'true');
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(loggedInUser));
      setUserData(loggedInUser);
      setIsLoggedIn(true); // Trigger re-render to show main app
  };

  // --- Logout Handler ---
  const handleLogout = () => {
    console.log("Handling logout");
    localStorage.removeItem(LOGIN_STATUS_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    setIsLoggedIn(false);
    setUserData(null);
  };

  // --- Render Logic ---

  // Loading state during initial auth check
  if (isLoadingAuth) {
      return (
          <div className="flex justify-center items-center min-h-screen">
              <p className="text-muted-foreground">Loading application...</p>
          </div>
      );
  }

  // Show AuthForm if not logged in
  if (!isLoggedIn) {
    // Pass the updated login handler
    return ( <AuthForm setIsLoggedIn={handleLoginSuccess} /> );
    // Toaster should be in layout.tsx if global
  }

  // Render main application if logged in
  return (
    <> {/* Use fragment if Toaster is not already in layout */}
      <div className="flex flex-col md:flex-row min-h-screen relative">

        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
             <Image src="/logo.png" alt="Logo" width={36} height={36} />
             <div className="flex-1"></div> {/* Spacer */}
             <UserProfile user={userData} onLogout={handleLogout} />
        </header>

        {/* Left Sidebar */}
        <aside className="w-full md:w-1/3 lg:w-1/4 xl:w-1/5 p-6 md:p-8 border-b md:border-b-0 md:border-r dark:border-slate-700/50 md:h-screen md:overflow-y-auto flex flex-col gap-6 md:gap-8">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between pb-4 border-b dark:border-slate-700/50 shrink-0">
                 <Image src="/logo.png" alt="Logo" width={40} height={40} priority />
                 <UserProfile user={userData} onLogout={handleLogout} />
            </div>
          {/* Textbook Selector */}
          <div className="flex-grow min-h-0">
             {/* ** PASS PAGE NUMBER SETTERS DOWN ** */}
             <TextbookSelector
                setSelectedChapterContent={setSelectedChapterContent}
                setSelectedSubject={setSelectedSubject}
                setSelectedGrade={setSelectedGrade}
                setStartPageNum={setStartPageNum} // Pass setter
                setEndPageNum={setEndPageNum}     // Pass setter
             />
          </div>
           {/* Content Preview */}
           {selectedChapterContent && (
            <Card className="mt-auto shrink-0 hidden md:block bg-card/80 backdrop-blur-sm border dark:border-slate-700/50">
              <CardHeader className="p-3 px-4"><CardTitle className="text-sm font-medium">Selected Content</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[150px] xl:h-[200px] w-full border-t dark:border-slate-700/50 p-2 bg-muted/40 dark:bg-muted/50">
                  <pre className="whitespace-pre-wrap text-xs font-mono">{selectedChapterContent}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Main Content Area (Dashboard) */}
        <main className="w-full md:flex-1 p-6 md:p-10 xl:p-12 md:h-screen md:overflow-y-auto pb-28 md:pb-10">
          {/* ** PASS PAGE NUMBER VALUES DOWN ** */}
          <Dashboard
            chapterContent={selectedChapterContent}
            subject={selectedSubject}
            grade={selectedGrade}
            startPage={startPageNum} // Pass value
            endPage={endPageNum}     // Pass value
          />
        </main>

        {/* Footer Button Container */}
         <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center items-center z-20 md:justify-end md:pr-10 lg:pr-16 xl:pr-20 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
              <Button size="lg" asChild variant="outline" className="bg-card/95 backdrop-blur-sm shadow-lg border border-border/70 pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-colors duration-200" >
                  <a href="https://t.me/grade9to12ethiopia" target="_blank" rel="noopener noreferrer"> Join our Telegram Channel </a>
              </Button>
          </div>

         {/* Background element is now likely in layout.tsx */}
         {/* <div className="blurred-logo-background fixed inset-0 z-[-1]"></div> */}
      </div>
      {/* If Toaster is not in layout, keep it here */}
      {/* <Toaster /> */}
    </>
  );
}

