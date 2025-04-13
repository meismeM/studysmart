"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TextbookSelectorProps {
  setSelectedChapterContent: (content: string) => void;
}

const textbooks = {
  "biology": "biology9_index.json",
  "chemistry": "chemistry9_index.json",
  "citizenship": "citizenship9_index.json",
  "economics": "economics9_index.json",
  "english": "english9_index.json",
  "geography": "geography9_index.json",
  "history": "history9_index.json",
  "physics": "physics9_index.json",
};

interface Chapter {
  chapter: string;
  content: string;
}

const TextbookSelector: React.FC<TextbookSelectorProps> = ({ setSelectedChapterContent }) => {
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState("");

  useEffect(() => {
    const loadChapters = async () => {
      if (subject && textbooks[subject]) {
        try {
          const response = await fetch(`/textbooks/${textbooks[subject]}`);
          if (response.ok) {
            const data: Chapter[] = await response.json();
            setChapters(data);
          } else {
            console.error("Failed to load chapter index.");
            setChapters([]);
          }
        } catch (error) {
          console.error("Error loading chapter index:", error);
          setChapters([]);
        }
      } else {
        setChapters([]);
      }
    };

    loadChapters();
  }, [subject]);

  useEffect(() => {
    if (selectedChapter) {
      const chapterContent = chapters.find(c => c.chapter === selectedChapter)?.content || "";
      setSelectedChapterContent(chapterContent);
    }
  }, [selectedChapter, chapters, setSelectedChapterContent]);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Textbook Chapter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select onValueChange={setSubject} defaultValue={subject}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(textbooks).map((key) => (
                  <SelectItem key={key} value={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="chapter">Chapter</Label>
            <Select onValueChange={setSelectedChapter} defaultValue={selectedChapter}>
              <SelectTrigger id="chapter">
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.chapter} value={chapter.chapter}>
                    {chapter.chapter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextbookSelector;
