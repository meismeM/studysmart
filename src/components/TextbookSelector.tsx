
"use client";

import React, {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';

interface TextbookSelectorProps {
  setSelectedChapterContent: (content: string) => void;
  setSelectedSubject: (subject: string) => void;
  setSelectedGrade: (grade: string) => void;
}

const grades = ["9", "10", "11", "12"];

// Store filenames directly
const textbooks: Record<string, Record<string, { name: string; filename: string }>> = {
 "9": {
    "biology": { name: "Biology", filename: "biology9_index.json" },
    "chemistry": { name: "Chemistry", filename: "chemistry9_index.json" },
    "citizenship": { name: "Citizenship", filename: "citizenship9_index.json" },
    "economics": { name: "Economics", filename: "economics9_index.json" },
    "english": { name: "English", filename: "english9_index.json" },
    "geography": { name: "Geography", filename: "geography9_index.json" },
    "history": { name: "History", filename: "history9_index.json" },
    "physics": { name: "Physics", filename: "physics9_index.json" },
    "mathematics": { name: "Mathematics", filename: "mathematics9_index.json" },
  },
  "10": {
    "biology": { name: "Biology", filename: "biology10_index.json" },
    "chemistry": { name: "Chemistry", filename: "chemistry10_index.json" },
    "citizenship": { name: "Citizenship", filename: "citizenship10_index.json" },
    "economics": { name: "Economics", filename: "economics10_index.json" },
    "english": { name: "English", filename: "english10_index.json" },
    "geography": { name: "Geography", filename: "geography10_index.json" },
    "history": { name: "History", filename: "history10_index.json" },
    "physics": { name: "Physics", filename: "physics10_index.json" },
    "mathematics": { name: "Mathematics", filename: "mathematics10_index.json" },
  },
    "11": {
    "biology": { name: "Biology", filename: "biology11_index.json" },
    "chemistry": { name: "Chemistry", filename: "chemistry11_index.json" },
    "citizenship": { name: "Citizenship", filename: "citizenship11_index.json" },
    "economics": { name: "Economics", filename: "economics11_index.json" },
    "english": { name: "English", filename: "english11_index.json" },
    "geography": { name: "Geography", filename: "geography11_index.json" },
    "history": { name: "History", filename: "history11_index.json" },
    "physics": { name: "Physics", filename: "physics11_index.json" },
    "mathematics": { name: "Mathematics", filename: "mathematics11_index.json" },
  },
    "12": {
    "biology": { name: "Biology", filename: "biology12_index.json" },
    "chemistry": { name: "Chemistry", filename: "chemistry12_index.json" },
    "citizenship": { name: "Citizenship", filename: "citizenship12_index.json" },
    "economics": { name: "Economics", filename: "economics12_index.json" },
    "english": { name: "English", filename: "english12_index.json" },
    "geography": { name: "Geography", filename: "geography12_index.json" },
    "history": { name: "History", filename: "history12_index.json" },
    "physics": { name: "Physics", filename: "physics12_index.json" },
    "mathematics": { name: "Mathematics", filename: "mathematics12_index.json" },
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
  const [subjectKey, setSubjectKey] = useState<string>(""); // Store subject key (e.g., 'biology')
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [startPage, setStartPage] = useState<number | undefined>(undefined);
  const [endPage, setEndPage] = useState<number | undefined>(undefined);
  const { toast } = useToast();
  const [availableSubjects, setAvailableSubjects] = useState<Record<string, { name: string; filename: string }>>({});

   useEffect(() => {
    // Update available subjects when grade changes
    setAvailableSubjects(textbooks[grade] || {});
    setSubjectKey(""); // Reset subject selection when grade changes
    setSelectedSubject(""); // Reset subject name in parent
    setChapters([]); // Clear chapters
    setSelectedChapterContent(""); // Clear content in parent
    setStartPage(undefined); // Clear page numbers
    setEndPage(undefined); // Clear page numbers
  }, [grade, setSelectedSubject, setSelectedChapterContent]);


  const loadChapters = useCallback(async (selectedSubjectKey: string, selectedGrade: string) => {
    if (selectedSubjectKey && selectedGrade) {
      const subjectData = textbooks[selectedGrade]?.[selectedSubjectKey];

      if (!subjectData) {
        // Textbook not available for this grade/subject combination
        setChapters([]);
        setSelectedChapterContent("");
        toast({
          title: "Info",
          description: `Textbook for ${selectedSubjectKey} (Grade ${selectedGrade}) is coming soon.`,
          variant: "default",
        });
        return;
      }

      const filename = subjectData.filename;

      try {
        const response = await fetch(`/textbooks/${filename}`);
        if (!response.ok) {
          // Handle file not found specifically
          if (response.status === 404) {
             toast({
                title: "Info",
                description: `Textbook for ${subjectData.name} (Grade ${selectedGrade}) is coming soon.`,
                variant: "default", // Use default or warning variant
             });
             setChapters([]);
             setSelectedChapterContent("");
          } else {
            throw new Error(`Failed to fetch textbook data: ${response.status}`);
          }
          return; // Stop execution if file not found or error
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
          description: `Failed to load textbook data for ${subjectData.name} (Grade ${selectedGrade}): ${error.message}. Make sure the file exists and is valid JSON.`,
          variant: "destructive",
        });
      }
    } else {
      setChapters([]);
    }
  }, [toast, setSelectedChapterContent]);

  useEffect(() => {
    if (subjectKey && grade) {
      const subjectName = textbooks[grade]?.[subjectKey]?.name || "";
      setSelectedSubject(subjectName); // Update parent with the subject *name*
      loadChapters(subjectKey, grade);
      setStartPage(undefined); // Reset page numbers when subject/grade changes
      setEndPage(undefined);
      setSelectedChapterContent(""); // Clear content initially
    } else {
        setChapters([]); // Clear chapters if subject or grade is not selected
        setSelectedChapterContent(""); // Clear content if subject or grade is not selected
        setSelectedSubject(""); // Clear subject name in parent
    }
  }, [subjectKey, grade, loadChapters, setSelectedChapterContent, setSelectedSubject]);


  useEffect(() => {
    // Logic to extract content based on start/end pages
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
        .join("\n\n"); // Join pages with double newline

       if (!selectedContent.trim()) { // Check if the content is empty after trimming whitespace
          toast({
            title: "Info",
            description: "No content found for the selected page range.",
            variant: "default",
          });
           setSelectedChapterContent(""); // Clear content if empty
        } else {
          setSelectedChapterContent(selectedContent);
        }


    } else if (startPage === undefined || endPage === undefined || startPage <= 0 || endPage <= 0) {
        // Clear content if page numbers are invalid or not set, unless chapters are loading/empty
        if (chapters.length > 0) { // Only clear if chapters are loaded but pages are invalid
             setSelectedChapterContent("");
        }
    }

  }, [chapters, startPage, endPage, setSelectedChapterContent, toast]);


  const handleSubjectChange = (value: string) => {
    setSubjectKey(value); // Update subject key state
    // setSelectedSubject is updated in the useEffect hook above
    setChapters([]); // Clear chapters when subject changes
    setSelectedChapterContent(""); // Clear content when subject changes
  };

  const handleGradeChange = (value: string) => {
    setGrade(value);
    setSelectedGrade(value); // Pass selected grade up
    // Available subjects and subject reset are handled by the useEffect[grade] hook
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
             <Select onValueChange={handleGradeChange} value={grade}>
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
            <Select onValueChange={handleSubjectChange} value={subjectKey} disabled={!grade}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                 {Object.entries(availableSubjects).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name}
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
                placeholder="Start"
                min="1" // Ensure start page is at least 1
                value={startPage === undefined ? '' : startPage}
                onChange={(e) => {
                   const value = parseInt(e.target.value);
                  setStartPage(isNaN(value) || value <= 0 ? undefined : value); // Ensure value is positive
                }}
                disabled={!subjectKey} // Disable if no subject selected
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="endPage">End Page</Label>
              <Input
                type="number"
                id="endPage"
                placeholder="End"
                 min={startPage || 1} // Ensure end page is at least start page
                 value={endPage === undefined ? '' : endPage}
                onChange={(e) => {
                   const value = parseInt(e.target.value);
                   setEndPage(isNaN(value) || value <= 0 ? undefined : value); // Ensure value is positive
                 }}
                 disabled={!subjectKey || startPage === undefined} // Disable if no subject or start page selected
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextbookSelector;

    