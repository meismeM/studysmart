"use client";

import Dashboard from "@/components/Dashboard";
import TextbookSelector from "@/components/TextbookSelector";
import { useState } from "react";

export default function Home() {
  const [selectedChapterContent, setSelectedChapterContent] = useState<string>("");

  return (
    <>
      <TextbookSelector setSelectedChapterContent={setSelectedChapterContent} />
      <Dashboard chapterContent={selectedChapterContent} />
    </>
  );
}

