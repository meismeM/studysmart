"use client";

import {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';

interface TextbookSelectorProps {
  setSelectedChapterContent: (content: string) => void;
}

const textbooks = {
  "biology9": "Biology",
  "chemistry9": "Chemistry",
  "citizenship9": "Citizenship",
  "economics9": "Economics",
  "english9": "English",
  "geography9": "Geography",
  "history9": "History",
  "physics9": "Physics",
};

interface Chapter {
  page_number: number;
  text: string;
}

interface TextbookData {
  textbook_id: string;
  chunks: Chapter[];
}

const TextbookSelector: React.FC<TextbookSelectorProps> = ({setSelectedChapterContent}) => {
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [startPage, setStartPage] = useState<number | undefined>(undefined);
  const [endPage, setEndPage] = useState<number | undefined>(undefined);
  const { toast } = useToast();
    const [availableTextbooks, setAvailableTextbooks] = useState<string[]>([]);

    useEffect(() => {
        const fetchTextbooks = async () => {
            setAvailableTextbooks(Object.keys(textbooks));
        };
        fetchTextbooks();
    }, []);

  const loadChapters = useCallback(async (selectedSubject: string) => {
    if (selectedSubject) {
      try {
        const response = await fetch(`/textbooks/${selectedSubject}_index.json`);
        if (!response.ok) {
          throw new Error(`Failed to fetch textbook data: ${response.status}`);
        }
        const data: TextbookData = await response.json();
        if (data && Array.isArray(data.chunks)) {
            setChapters(data.chunks);
          } else {
            console.error("Invalid data format: chunks is not an array.");
            setChapters([]);
            toast({
              title: "Error",
              description: "Invalid data format in textbook data.",
              variant: "destructive",
            });
          }
      } catch (error: any) {
        console.error("Error loading chapter index:", error);
        setChapters([]);
        toast({
          title: "Error",
          description: `Failed to load textbook data: ${error.message}.  Make sure that the 'public/textbooks' folder contains valid json textbook files`,
          variant: "destructive",
        });
      }
    } else {
      setChapters([]);
    }
  }, [toast]);

  useEffect(() => {
    if (subject) {
      loadChapters(subject);
      setStartPage(undefined);
      setEndPage(undefined);
    }
  }, [subject, loadChapters]);

  useEffect(() => {
    if (chapters && chapters.length > 0 && startPage && endPage) {
      if (startPage > endPage) {
        toast({
          title: "Warning",
          description: "Start page cannot be greater than end page.",
          variant: "destructive",
        });
        return;
      }

      const selectedContent = chapters
        .filter(chapter => chapter.page_number >= startPage && chapter.page_number <= endPage)
        .map(chapter => chapter.text)
        .join("\n\n");
      setSelectedChapterContent(selectedContent);
    } else {
      setSelectedChapterContent("");
    }
  }, [chapters, startPage, endPage, setSelectedChapterContent, toast]);

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
                {availableTextbooks.map((key) => (
                  <SelectItem key={key} value={key}>
                    {textbooks[key as keyof typeof textbooks]}
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
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setStartPage(isNaN(value) ? undefined : value);
                }}
              />
            </div>
            <div>
              <Label htmlFor="endPage">End Page</Label>
              <Input
                type="number"
                id="endPage"
                placeholder="End Page"
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setEndPage(isNaN(value) ? undefined : value);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextbookSelector;
