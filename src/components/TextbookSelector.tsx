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
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  useEffect(() => {
    const loadChapters = async () => {
      if (subject && textbooks[subject]) {
        try {
          const response = await fetch(`/textbooks/${textbooks[subject]}`);
          if (response.ok) {
            const data: TextbookData = await response.json();
            if (Array.isArray(data.chunks)) {
              const enrichedChapters = data.chunks.map((chunk, index) => ({
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
    };

    loadChapters();
  }, [subject]);

  useEffect(() => {
    if (selectedChapters.length > 0) {
      const concatenatedContent = selectedChapters.map(chapterText => {
        const chapter = chapters.find(c => c.text === chapterText);
        return chapter?.text || "";
      }).join("\n\n"); // Join with double newline for separation

      setSelectedChapterContent(concatenatedContent);
    } else {
      setSelectedChapterContent(""); // Clear content if no chapters are selected
    }
  }, [selectedChapters, chapters, setSelectedChapterContent]);

  const handleChapterSelect = (chapterText: string) => {
    setSelectedChapters(prev => {
      if (prev.includes(chapterText)) {
        // If already selected, remove it
        return prev.filter(text => text !== chapterText);
      } else {
        // Otherwise, add it to the array
        return [...prev, chapterText];
      }
    });
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Textbook Chapter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select onValueChange={setSubject} >
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
            <Select multiple onValueChange={(values: string[]) => setSelectedChapters(values)}>
              <SelectTrigger id="chapter" >
                <SelectValue placeholder="Select chapter(s)" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter, index) => (
                  // Use a unique key based on textbook_id and index
                  chapter.text ? (
                    <SelectItem key={`${textbooks[subject]}-${index}`} value={chapter.text} >
                      {chapter.chapter}
                    </SelectItem>
                  ) : null
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
