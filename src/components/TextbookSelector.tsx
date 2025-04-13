"use client";

import {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";

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

const TextbookSelector: React.FC<TextbookSelectorProps> = ({setSelectedChapterContent}) => {
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  const loadChapters = useCallback(async (selectedSubject: string) => {
    if (selectedSubject && textbooks[selectedSubject]) {
      try {
        const response = await fetch(`/${textbooks[selectedSubject]}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch textbook data: ${response.status}`);
        }
        const data: TextbookData = await response.json();
        if (Array.isArray(data.chunks)) {
          // Map over the chunks and add a displayable chapter name (page)
          const enrichedChapters = data.chunks.map((chunk) => ({
            ...chunk,
            chapter: `Page ${chunk.page_number}`,
          }));
          setChapters(enrichedChapters);
        } else {
          console.error("Invalid data format: chunks is not an array.");
          setChapters([]);
        }
      } catch (error: any) {
        console.error("Error loading chapter index:", error);
        setChapters([]);
      }
    } else {
      setChapters([]);
    }
  }, []);

  useEffect(() => {
    if (subject) {
      loadChapters(subject);
    }
  }, [subject, loadChapters]);

  useEffect(() => {
    if (selectedChapters && selectedChapters.length > 0) {
      const selectedContent = chapters
        .filter(chapter => selectedChapters.includes(chapter.chapter))
        .map(chapter => chapter.text)
        .join("\n\n");
      setSelectedChapterContent(selectedContent);
    } else {
      setSelectedChapterContent("");
    }
  }, [selectedChapters, chapters, setSelectedChapterContent]);

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
          <div>
            <Label htmlFor="chapter">Chapter(s)</Label>
            <Select
              multiple
              onValueChange={setSelectedChapters}
              defaultValue={[]}
            >
              <SelectTrigger id="chapter">
                <SelectValue placeholder="Select chapter(s)" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.text} value={chapter.chapter}>
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
