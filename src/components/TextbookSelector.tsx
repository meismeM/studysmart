"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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
  page_number: number;
  text: string;
  chapter: string;
}

interface TextbookData {
  chunks: Chapter[];
  textbook_id?: string;
}

const TextbookSelector: React.FC<TextbookSelectorProps> = ({ setSelectedChapterContent }) => {
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [startPage, setStartPage] = useState<number | null>(null);
  const [endPage, setEndPage] = useState<number | null>(null);

  useEffect(() => {
    const loadChapters = async () => {
      if (subject && textbooks[subject]) {
        try {
          const response = await fetch(`/textbooks/${textbooks[subject]}`);
          if (response.ok) {
            const data: TextbookData = await response.json();
            if (Array.isArray(data.chunks)) {
              const enrichedChapters = data.chunks.map((chunk) => ({
                ...chunk,
                chapter: `Page ${chunk.page_number}`,
              }));
              setChapters(enrichedChapters);
            } else {
              console.error("Invalid data format: chunks is not an array.");
              setChapters([]);
            }
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
      setStartPage(null);
      setEndPage(null);
    };

    loadChapters();
  }, [subject]);

  useEffect(() => {
    if (startPage !== null && endPage !== null && chapters.length > 0) {
      const start = Math.min(startPage, endPage);
      const end = Math.max(startPage, endPage);

      const selectedContent = chapters
        .filter(chapter => chapter.page_number >= start && chapter.page_number <= end)
        .map(chapter => chapter.text)
        .join("\n\n");

      setSelectedChapterContent(selectedContent);
    } else {
      setSelectedChapterContent("");
    }
  }, [startPage, endPage, chapters, setSelectedChapterContent]);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Textbook Chapter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select onValueChange={setSubject}>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startPage">Start Page</Label>
              <Input
                type="number"
                id="startPage"
                placeholder="Start Page"
                onChange={(e) => setStartPage(Number(e.target.value))}
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="endPage">End Page</Label>
              <Input
                type="number"
                id="endPage"
                placeholder="End Page"
                onChange={(e) => setEndPage(Number(e.target.value))}
                min="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextbookSelector;
