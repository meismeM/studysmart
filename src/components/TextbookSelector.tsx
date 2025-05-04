// src/components/TextbookSelector.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';

// --- Define Component Props ---
interface TextbookSelectorProps {
  setSelectedChapterContent: (content: string) => void;
  setSelectedSubject: (subject: string) => void;
  setSelectedGrade: (grade: string) => void;
  // Add setters for page numbers from parent
  setStartPageNum: (page: number | undefined) => void;
  setEndPageNum: (page: number | undefined) => void;
}

// --- Component Data ---
const grades = ["9", "10", "11", "12"];

// ** IMPORTANT: Update pageOffset values for your actual files! **
const textbooks: Record<string, Record<string, { name: string; filename: string; pageOffset: number }>> = {
 "9": { "biology": { name: "Biology", filename: "biology9_index.json", pageOffset: 7 }, "chemistry": { name: "Chemistry", filename: "chemistry9_index.json", pageOffset: 7 }, "citizenship": { name: "Citizenship", filename: "citizenship9_index.json", pageOffset: 8 }, "economics": { name: "Economics", filename: "economics9_index.json", pageOffset: 7 }, "english": { name: "English", filename: "english9_index.json", pageOffset: 11 }, "geography": { name: "Geography", filename: "geography9_index.json", pageOffset: 5 }, "history": { name: "History", filename: "history9_index.json", pageOffset: 9 }, "physics": { name: "Physics", filename: "physics9_index.json", pageOffset: 7 }, "ict": { name: "ICT", filename: "ict9_index.json", pageOffset: 7 }, "mathematics": { name: "Mathematics", filename: "mathematics9_index.json", pageOffset: 11 }, },
 "10": { "biology": { name: "Biology", filename: "biology10_index.json", pageOffset: 3 }, "chemistry": { name: "Chemistry", filename: "chemistry10_index.json", pageOffset: 7 }, "citizenship": { name: "Citizenship", filename: "citizenship10_index.json", pageOffset: 8 }, "economics": { name: "Economics", filename: "economics10_index.json", pageOffset: 8 }, "english": { name: "English", filename: "english10_index.json", pageOffset: 6 }, "geography": { name: "Geography", filename: "geography10_index.json", pageOffset: 6 }, "history": { name: "History", filename: "history10_index.json", pageOffset: 8 }, "physics": { name: "Physics", filename: "physics10_index.json", pageOffset: 6 }, "ict": { name: "ICT", filename: "ict10_index.json", pageOffset: 7 }, "mathematics": { name: "Mathematics", filename: "mathematics10_index.json", pageOffset: 9 }, },
 "11": { "biology": { name: "Biology", filename: "biology11_index.json", pageOffset: 10 }, "chemistry": { name: "Chemistry", filename: "chemistry11_index.json", pageOffset: 10 }, "economics": { name: "Economics", filename: "economics11_index.json", pageOffset: 11 }, "english": { name: "English", filename: "english11_index.json", pageOffset: 6 }, "geography": { name: "Geography", filename: "geography11_index.json", pageOffset: 8 }, "history": { name: "History", filename: "history11_index.json", pageOffset: 7 }, "physics": { name: "Physics", filename: "physics11_index.json", pageOffset: 6 }, "ict": { name: "ICT", filename: "ict11_index.json", pageOffset: 6 }, "agriculture": { name: "Agriculture", filename: "agriculture11_index.json",pageOffset: 8 }, "mathematics": { name: "Mathematics", filename: "mathematics11_index.json",pageOffset: 8 }, },
 "12": { "biology": { name: "Biology", filename: "biology12_index.json", pageOffset: 6 }, "chemistry": { name: "Chemistry", filename: "chemistry12_index.json", pageOffset: 8 }, "economics": { name: "Economics", filename: "economics12_index.json", pageOffset: 10 }, "english": { name: "English", filename: "english12_index.json", pageOffset: 6 }, "geography": { name: "Geography", filename: "geography12_index.json", pageOffset: 8 }, "history": { name: "History", filename: "history12_index.json", pageOffset: 4 }, "physics": { name: "Physics", filename: "physics12_index.json", pageOffset: 6 }, "ict": { name: "ICT", filename: "ict12_index.json", pageOffset: 7 }, "agriculture": { name: "Agriculture", filename: "agriculture12_index.json",pageOffset: 9 }, "mathematics": { name: "Mathematics", filename: "mathematics12_index.json",pageOffset: 5 }, },
};

interface Chapter { page_number: number; text: string; }
interface TextbookData { textbook_id: string; chunks: Chapter[]; }

// --- Component ---
const TextbookSelector: React.FC<TextbookSelectorProps> = ({
    setSelectedChapterContent,
    setSelectedSubject,
    setSelectedGrade,
    setStartPageNum, // Destructure setters
    setEndPageNum
}) => {
  // --- State ---
  const [grade, setGrade] = useState<string>("9");
  const [subjectKey, setSubjectKey] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [startPageInput, setStartPageInput] = useState<string>(""); // Use string state for inputs
  const [endPageInput, setEndPageInput] = useState<string>("");
  const { toast } = useToast();
  const [availableSubjects, setAvailableSubjects] = useState<Record<string, { name: string; filename: string; pageOffset: number }>>({});
  const [isChapterDataAvailable, setIsChapterDataAvailable] = useState(false);

  // --- Effects ---

  // Reset state when grade changes
  useEffect(() => {
    setAvailableSubjects(textbooks[grade] || {});
    setSubjectKey(""); setSelectedSubject("");
    setChapters([]); setSelectedChapterContent("");
    setStartPageInput(""); setEndPageInput(""); // Reset input strings
    setStartPageNum(undefined); setEndPageNum(undefined); // Reset parent state
    setIsChapterDataAvailable(false);
  }, [grade, setSelectedSubject, setSelectedChapterContent, setStartPageNum, setEndPageNum]);

  // Load chapter data
  const loadChapters = useCallback(async (selectedSubjectKey: string, selectedGrade: string) => {
    setIsChapterDataAvailable(false); setChapters([]); setSelectedChapterContent("");
    if (!selectedSubjectKey || !selectedGrade) return;
    const subjectData = textbooks[selectedGrade]?.[selectedSubjectKey];
    if (!subjectData) return;
    const filename = subjectData.filename; console.log(`Attempting to load: /textbooks/${filename}`);
    try {
        const response = await fetch(`/textbooks/${filename}`); console.log(`Fetch status for ${filename}: ${response.status}`);
        if (!response.ok) { if (response.status === 404) toast({ title: "Info", description: `File not found: ${filename}`, variant: "default" }); else throw new Error(`HTTP error ${response.status}`); return; }
        let data: TextbookData | null = null;
        try { data = await response.json(); } catch(parseError: any) { console.error(`Parse JSON error for ${filename}:`, parseError); toast({ title: "File Format Error", description: `Cannot read ${filename}. Invalid JSON.`, variant: "destructive", }); return; }
        if (data && Array.isArray(data.chunks)) { if (data.chunks.length === 0 || (typeof data.chunks[0]?.page_number === 'number' && typeof data.chunks[0]?.text === 'string')) { setChapters(data.chunks); setIsChapterDataAvailable(data.chunks.length > 0); console.log(`Loaded ${data.chunks.length} chapters from ${filename}. Available: ${data.chunks.length > 0}`); } else { console.error(`Invalid chunk structure in ${filename}:`, data.chunks[0]); toast({ title: "File Content Error", description: `Invalid chapter structure in ${filename}.`, variant: "destructive", }); } } else { console.error(`Invalid top-level structure in ${filename}:`, data); toast({ title: "File Structure Error", description: `Missing 'chunks' array in ${filename}.`, variant: "destructive", }); }
    } catch (error: any) { console.error(`Error loading ${filename}:`, error); toast({ title: "Error Loading Textbook", description: `Failed to load ${filename}. ${error.message}`, variant: "destructive", }); }
  }, [toast, setSelectedChapterContent]);

  // Trigger chapter load when subject/grade changes
  useEffect(() => {
    const subjectName = textbooks[grade]?.[subjectKey]?.name || "";
    setSelectedSubject(subjectName);
    if (subjectKey && grade) {
      loadChapters(subjectKey, grade);
      setStartPageInput(""); setEndPageInput("");
      setStartPageNum(undefined); setEndPageNum(undefined);
    } else {
      setChapters([]); setIsChapterDataAvailable(false);
      setSelectedChapterContent("");
    }
  }, [subjectKey, grade, loadChapters, setSelectedSubject, setSelectedChapterContent, setStartPageNum, setEndPageNum]);

  // Effect to update PARENT page number state from local input strings
  useEffect(() => {
    const startNum = parseInt(startPageInput);
    const endNum = parseInt(endPageInput);
    const validStart = !isNaN(startNum) && startNum > 0;
    const validEnd = !isNaN(endNum) && endNum > 0;
    setStartPageNum(validStart ? startNum : undefined);
    setEndPageNum(validEnd ? endNum : undefined);
  }, [startPageInput, endPageInput, setStartPageNum, setEndPageNum]);

  // Effect to filter content based on validated page numbers and loaded chapters
  useEffect(() => {
     const currentOffset = textbooks[grade]?.[subjectKey]?.pageOffset ?? 0;
     // Parse numbers here for filtering logic
     const startNum = parseInt(startPageInput);
     const endNum = parseInt(endPageInput);
     const validStart = !isNaN(startNum) && startNum > 0;
     const validEnd = !isNaN(endNum) && endNum > 0;

     if (isChapterDataAvailable && validStart && validEnd) {
         if (startNum > endNum) { toast({ title: "Warning", description: "Start page cannot be greater than end page.", variant: "destructive" }); setSelectedChapterContent(""); return; }
         const adjustedStartPage = startNum + currentOffset;
         const adjustedEndPage = endNum + currentOffset;
         const selectedContent = chapters.filter(chapter => chapter.page_number >= adjustedStartPage && chapter.page_number <= adjustedEndPage).map(chapter => chapter.text).join("\n\n");
         if (!selectedContent.trim()) { toast({ title: "Info", description: "No content found for selected pages.", variant: "default" }); setSelectedChapterContent(""); } else { setSelectedChapterContent(selectedContent); }
     } else {
         setSelectedChapterContent("");
     }
  }, [chapters, startPageInput, endPageInput, isChapterDataAvailable, grade, subjectKey, setSelectedChapterContent, toast]);


  // --- Event Handlers ---
  const handleSubjectChange = (value: string) => { setSubjectKey(value); };
  const handleGradeChange = (value: string) => { setGrade(value); setSelectedGrade(value); };
  // Update string state on input change
  const handleStartPageChange = (e: React.ChangeEvent<HTMLInputElement>) => { setStartPageInput(e.target.value); };
  const handleEndPageChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEndPageInput(e.target.value); };


  // --- Render JSX ---
  return (
    <Card className="shadow-md dark:shadow-slate-800 border dark:border-slate-700/50 h-full">
      <CardHeader className="p-4 md:p-6 border-b dark:border-slate-700/50">
        <CardTitle className="text-base md:text-lg font-semibold">Select Textbook Chapter</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:gap-5 p-4 md:p-6">
        {/* Grade Selector */}
        <div><Label htmlFor="grade-selector" className="mb-1.5 block text-sm font-medium">Grade</Label><Select onValueChange={handleGradeChange} value={grade}><SelectTrigger id="grade-selector" className="h-10 md:h-9"><SelectValue placeholder="Select grade" /></SelectTrigger><SelectContent>{grades.map((g) => ( <SelectItem key={g} value={g}> Grade {g} </SelectItem> ))}</SelectContent></Select></div>
        {/* Subject Selector */}
        <div><Label htmlFor="subject-selector" className="mb-1.5 block text-sm font-medium">Subject</Label><Select onValueChange={handleSubjectChange} value={subjectKey} disabled={!grade}><SelectTrigger id="subject-selector" className="h-10 md:h-9"><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent> {Object.entries(availableSubjects).length > 0 ? ( Object.entries(availableSubjects).map(([key, value]) => ( <SelectItem key={key} value={key}> {value.name} </SelectItem> )) ) : ( <div className="px-2 py-1.5 text-sm text-muted-foreground italic">{grade ? "No subjects available" : "Select grade"}</div> )} </SelectContent></Select></div>
        {/* Page Range Inputs */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div>
            <Label htmlFor="startPage-input" className="mb-1.5 block text-sm font-medium">Start Page</Label>
            <Input type="number" id="startPage-input" placeholder="e.g., 1" min="1" value={startPageInput} onChange={handleStartPageChange} disabled={!subjectKey || !isChapterDataAvailable} className="w-full h-10 md:h-9"/>
          </div>
          <div>
            <Label htmlFor="endPage-input" className="mb-1.5 block text-sm font-medium">End Page</Label>
            <Input type="number" id="endPage-input" placeholder="e.g., 5" min={parseInt(startPageInput) || 1} value={endPageInput} onChange={handleEndPageChange} disabled={!subjectKey || !startPageInput || !isChapterDataAvailable} className="w-full h-10 md:h-9"/>
          </div>
        </div>
         <p className="text-xs text-muted-foreground text-center -mt-2 md:-mt-3">Enter page numbers as printed in the textbook.</p>
      </CardContent>
    </Card>
  );
};

export default TextbookSelector;

