"use client";

import Dashboard from "@/components/Dashboard";
import TextbookSelector from "@/components/TextbookSelector";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const [selectedChapterContent, setSelectedChapterContent] = useState<string>("");

  return (
    <>
       <ThemeToggle />
      <TextbookSelector setSelectedChapterContent={setSelectedChapterContent} />
      <Dashboard chapterContent={selectedChapterContent} />
    </>
  );
}

