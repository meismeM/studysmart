"use client";

import Dashboard from "@/components/Dashboard";
import TextbookSelector from "@/components/TextbookSelector";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";


export default function Home() {
  const [selectedChapterContent, setSelectedChapterContent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("9"); // Default to grade 9

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-1/3 p-4 border-r overflow-y-auto">
        <TextbookSelector
          setSelectedChapterContent={setSelectedChapterContent}
          setSelectedSubject={setSelectedSubject}
          setSelectedGrade={setSelectedGrade}
        />
         {selectedChapterContent && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Selected Chapter Content</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full border p-2 rounded-md">
                <pre className="whitespace-pre-wrap text-sm">
                  {selectedChapterContent}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="w-full md:w-2/3 p-4 overflow-y-auto">
        <Dashboard
          chapterContent={selectedChapterContent}
          subject={selectedSubject}
          grade={selectedGrade}
        />
      </div>
    </div>
  );
}
