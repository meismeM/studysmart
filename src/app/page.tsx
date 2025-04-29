"use client";

import Dashboard from "@/components/Dashboard";
import TextbookSelector from "@/components/TextbookSelector";
import { useState } from "react";


export default function Home() {
  const [selectedChapterContent, setSelectedChapterContent] = useState<string>("");
   const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedGrade, setSelectedGrade] = useState<string>("9"); // Default to grade 9

  return (
    <>

      <TextbookSelector
        setSelectedChapterContent={setSelectedChapterContent}
        setSelectedSubject={setSelectedSubject}
        setSelectedGrade={setSelectedGrade}
      />
      <Dashboard
        chapterContent={selectedChapterContent}
        subject={selectedSubject}
        grade={selectedGrade}
       />
    </>
  );
}
    