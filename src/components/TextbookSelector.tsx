"use client";

import {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';

interface TextbookSelectorProps {
  setSelectedChapterContent: (content: string) => void;
  setSelectedSubject: (subject: string) => void; // Add prop to pass subject up
  setSelectedGrade: (grade: string) => void; // Add prop to pass grade up
}

const grades = ["9", "10", "11", "12"];

const textbooks: Record<string, Record<string, string>> = {
 "9": {
    "biology9": "Biology",
    "chemistry9": "Chemistry",
    "citizenship9": "Citizenship",
    "economics9": "Economics",
    "english9": "English",
    "geography9": "Geography",
    "history9": "History",
    "physics9": "Physics",
    "mathematics9": "Mathematics",
  },
  "10": {
    "biology10": "Biology",
    "chemistry10": "Chemistry",
    "citizenship10": "Citizenship",
    "economics10": "Economics",
    "english10": "English",
    "geography10": "Geography",
    "history10": "History",
    "physics10": "Physics",
    "mathematics10": "Mathematics",
  },
    "11": {
    "biology11": "Biology",
    "chemistry11": "Chemistry",
    "citizenship11": "Citizenship",
    "economics11": "Economics",
    "english11": "English",
    "geography11": "Geography",
    "history11": "History",
    "physics11": "Physics",
    "mathematics11": "Mathematics",
  },
    "12": {
    "biology12": "Biology",
    "chemistry12": "Chemistry",
    "citizenship12": "Citizenship",
    "economics12": "Economics",
    "english12": "English",
    "geography12": "Geography",
    "history12": "History",
    "physics12": "Physics",
    "mathematics12": "Mathematics",
  },
};

interface Chapter {
  page_number: number;
  text: string;
}

interface TextbookData {
  textbook_id: string;
  chunks: Chapter[];
}

const TextbookSelector: React.FC<TextbookSelectorProps> = ({setSelectedChapterContent, setSelectedSubject, setSelectedGrade}) => {
  const [grade, setGrade] = useState<string>("9"); // Default grade
  const [subject, setSubject] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [startPage, setStartPage] = useState<number | undefined>(undefined);
  const [endPage, setEndPage] = useState<number | undefined>(undefined);
  const { toast } = useToast();
  const [availableSubjects, setAvailableSubjects] = useState<Record<string, string>>({});

   useEffect(() => {
    // Update available subjects when grade changes
    setAvailableSubjects(textbooks[grade] || {});
    setSubject(""); // Reset subject selection when grade changes
    setSelectedSubject(""); // Reset subject in parent
    setChapters([]); // Clear chapters
    setSelectedChapterContent(""); // Clear content in parent
  }, [grade, setSelectedSubject, setSelectedChapterContent]);


  const loadChapters = useCallback(async (selectedSubject: string, selectedGrade: string) => {
    if (selectedSubject && selectedGrade) {
         const filename = `${selectedSubject}_index.json`; // Construct filename correctly
      try {
        const response = await fetch(`/textbooks/${filename}`);
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
          description: `Failed to load textbook data for ${selectedSubject} (Grade ${selectedGrade}): ${error.message}. Make sure the file exists and is valid JSON.`,
          variant: "destructive",
        });
      }
    } else {
      setChapters([]);
    }
  }, [toast]);

  useEffect(() => {
    if (subject && grade) {
      loadChapters(subject, grade);
      setStartPage(undefined);
      setEndPage(undefined);
    } else {
        setChapters([]); // Clear chapters if subject or grade is not selected
        setSelectedChapterContent(""); // Clear content if subject or grade is not selected
    }
  }, [subject, grade, loadChapters, setSelectedChapterContent]);

  useEffect(() => {
    if (chapters && chapters.length > 0 && startPage !== undefined && endPage !== undefined && startPage > 0 && endPage > 0) {
       if (startPage > endPage) {
        toast({
          title: "Warning",
          description: "Start page cannot be greater than end page.",
          variant: "destructive",
        });
         setSelectedChapterContent(""); // Clear content on error
        return;
      }

      const selectedContent = chapters
        .filter(chapter => chapter.page_number >= startPage && chapter.page_number <= endPage)
        .map(chapter => chapter.text)
        .join("\n\n");

         if (!selectedContent) {
          toast({
            title: "Info",
            description: "No content found for the selected page range.",
          });
        }

      setSelectedChapterContent(selectedContent || ""); // Ensure content is cleared if no text found

    } else if (startPage === undefined || endPage === undefined || startPage <= 0 || endPage <= 0) {
        // Clear content if page numbers are invalid or not set
      setSelectedChapterContent("");
    }

  }, [chapters, startPage, endPage, setSelectedChapterContent, toast]);

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setSelectedSubject(value); // Pass selected subject up
    setChapters([]); // Clear chapters when subject changes
    setSelectedChapterContent(""); // Clear content when subject changes
  };

  const handleGradeChange = (value: string) => {
    setGrade(value);
    setSelectedGrade(value); // Pass selected grade up
    // Available subjects and subject reset are handled by the useEffect hook
  };


  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Textbook Chapter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="grade">Grade</Label>
             <Select onValueChange={handleGradeChange} defaultValue={grade}>
              <SelectTrigger id="grade">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g} value={g}>
                    Grade {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select onValueChange={handleSubjectChange} value={subject} disabled={!grade}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                 {Object.entries(availableSubjects).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
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
                min="1" // Ensure start page is at least 1
                value={startPage === undefined ? '' : startPage}
                onChange={(e) => {
                   const value = parseInt(e.target.value);
                  setStartPage(isNaN(value) || value <= 0 ? undefined : value); // Ensure value is positive
                }}
                disabled={!subject} // Disable if no subject selected
              />
            </div>
            <div>
              <Label htmlFor="endPage">End Page</Label>
              <Input
                type="number"
                id="endPage"
                placeholder="End Page"
                 min="1" // Ensure end page is at least 1
                 value={endPage === undefined ? '' : endPage}
                onChange={(e) => {
                   const value = parseInt(e.target.value);
                  setEndPage(isNaN(value) || value <= 0 ? undefined : value); // Ensure value is positive
                }}
                 disabled={!subject} // Disable if no subject selected
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextbookSelector;
    