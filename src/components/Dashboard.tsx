// src/components/Dashboard.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  generateStudyQuestions,
  GenerateStudyQuestionsInput,
  GenerateStudyQuestionsOutput,
} from '@/ai/flows/generate-study-questions';
import { generateNotes, GenerateNotesOutput } from '@/ai/flows/generate-notes';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { jsPDF, TextOptionsLight } from "jspdf";
import ReactMarkdown, { Components } from 'react-markdown'; // Import Components type
import remarkGfm from 'remark-gfm';
import { Eye, EyeOff, Loader2, AlertCircle, FileText, HelpCircle, ListChecks, Sparkles, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { loadImageData } from '@/lib/imageUtils'; // Assuming imageUtils.ts is in src/lib

// --- Constants and Types ---
type ExplicitQuestionTypeValue = | 'multiple-choice' | 'short-answer' | 'fill-in-the-blank' | 'true-false';
const availableQuestionTypes: readonly ExplicitQuestionTypeValue[] = [ 'multiple-choice', 'short-answer', 'fill-in-the-blank', 'true-false', ];
type CurrentQuestionTypeValue = ExplicitQuestionTypeValue;
const questionTypeTitles: Record<CurrentQuestionTypeValue, string> = { 'multiple-choice': 'Multiple Choice', 'short-answer': 'Short Answer', 'fill-in-the-blank': 'Fill-in-the-Blank', 'true-false': 'True/False', };
type Question = { question: string; answer?: string; options?: string[]; correctAnswerIndex?: number; explanation?: string; };

// --- Helper Functions ---
function createInitialRecordState<T>(keys: readonly CurrentQuestionTypeValue[], defaultValue: T): Record<CurrentQuestionTypeValue, T> { const initialState = {} as Record<CurrentQuestionTypeValue, T>; keys.forEach((key) => { initialState[key] = defaultValue; }); return initialState; }
function createInitialNestedRecordState<T>(keys: readonly CurrentQuestionTypeValue[]): Record<CurrentQuestionTypeValue, Record<number, T>> { const initialState = {} as Record< CurrentQuestionTypeValue, Record<number, T> >; keys.forEach((key) => { initialState[key] = {}; }); return initialState; }

// --- Props Interface ---
interface DashboardProps { chapterContent: string; subject: string; grade: string; startPage?: number; endPage?: number; }

// --- Component ---
const Dashboard: React.FC<DashboardProps> = ({
  chapterContent: initialChapterContent,
  subject,
  grade,
  startPage,
  endPage
}) => {
  // === State ===
  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [noteGenerationMessage, setNoteGenerationMessage] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<CurrentQuestionTypeValue, Question[]>>(() => createInitialRecordState(availableQuestionTypes, []));
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<Record<CurrentQuestionTypeValue, boolean>>(() => createInitialRecordState(availableQuestionTypes, false));
  const [questionGenerationMessage, setQuestionGenerationMessage] = useState<Record<CurrentQuestionTypeValue, string | null>>(() => createInitialRecordState<string | null>(availableQuestionTypes, null));
  const [showAnswer, setShowAnswer] = useState<Record<CurrentQuestionTypeValue, Record<number, boolean>>>(() => createInitialNestedRecordState<boolean>(availableQuestionTypes));
  const [componentError, setComponentError] = useState<string | null>(null);
  const [activeQuestionTab, setActiveQuestionTab] = useState<CurrentQuestionTypeValue>('multiple-choice');
  const { toast } = useToast();

  // === Memos & Effects ===
  const initialQuestionState = useMemo(() => createInitialRecordState(availableQuestionTypes, []), []);
  const initialLoadingState = useMemo(() => createInitialRecordState(availableQuestionTypes, false), []);
  const initialMessageState = useMemo(() => createInitialRecordState<string | null>(availableQuestionTypes, null), []);
  const initialShowAnswerState = useMemo(() => createInitialNestedRecordState<boolean>(availableQuestionTypes), []);
  useEffect(() => { setChapterContent(initialChapterContent); setGeneratedNotes(''); setIsGeneratingNotes(false); setNoteGenerationMessage(null); setGeneratedQuestions(initialQuestionState); setIsGeneratingQuestions(initialLoadingState); setQuestionGenerationMessage(initialMessageState); setShowAnswer(initialShowAnswerState); setComponentError(null); setActiveQuestionTab('multiple-choice'); }, [initialChapterContent, subject, grade, initialQuestionState, initialLoadingState, initialMessageState, initialShowAnswerState]);

  // === Helpers ===
  const getCorrectAnswerLetter = (index?: number): string | null => { if (typeof index !== 'number' || index < 0 || index > 3) return null; return String.fromCharCode(65 + index); };
  const toggleShowAnswer = ( questionType: CurrentQuestionTypeValue, index: number ) => { setShowAnswer((prev) => { const current = prev[questionType] ?? {}; return { ...prev, [questionType]: { ...current, [index]: !current[index] } }; }); };
  const validateInputs = (): boolean => { setComponentError(null); let isValid = true; let errorMsg = ''; if (!subject || !grade) { errorMsg = 'Grade & Subject required.'; isValid = false; } else if (!chapterContent || chapterContent.trim().length < 20) { errorMsg = 'Chapter content missing or too short.'; isValid = false; } if (!isValid) { toast({ title: 'Input Missing', description: errorMsg, variant: 'destructive' }); setComponentError(errorMsg); } return isValid; };

  // === Renderers ===
  const renderInlineFormatting = (text: string | null | undefined): string => { if (!text) return ''; let html = text; html = html.replace(/</g, '<').replace(/>/g, '>'); html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); html = html.replace(/__(.*?)__/g, '<strong>$1</strong>'); html = html.replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '<em>$1</em>'); html = html.replace(/(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g, '<em>$1</em>'); html = html.replace(/`(.*?)`/g, '<code class="bg-muted text-muted-foreground px-1 py-0.5 rounded font-mono text-sm">$1</code>'); html = html.replace(/__+/g, '<span class="italic text-muted-foreground">[blank]</span>'); return html; };
  const renderQuestionContent = ( questionType: CurrentQuestionTypeValue, question: Question, index: number ): React.ReactNode => { /* ... Full implementation ... */ };

  // === Generation Handlers ===
  const handleGenerateNotes = async () => { /* ... Full implementation ... */ };
  const handleGenerateQuestions = async (questionType: CurrentQuestionTypeValue) => { /* ... Full implementation ... */ };

  // === PDF Download Handlers (Corrected Scope and Markdown Processing) ===
   const handleDownloadNotesPdf = async () => {
      if (!generatedNotes.trim()) { toast({ title: "Cannot Download", description: "No notes generated.", variant: "destructive"}); return; }
      try {
        let logoDataUrl: string | null = null;
        let logoX = 0, logoY = 0, logoWidth = 0, logoHeight = 0;
        try { logoDataUrl = await loadImageData('/logo.png'); }
        catch (imgError: any) { console.warn("Could not load logo for PDF:", imgError.message); }

        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        const pageHeight = doc.internal.pageSize.height; const pageWidth = doc.internal.pageSize.width; const margin = 40; const maxLineWidth = pageWidth - margin * 2; let yPos = margin; const footerStartY = pageHeight - margin - 30;

        const addLogoIfNeeded = () => { if (logoDataUrl) { logoWidth = 30; logoHeight = 30; logoX = pageWidth - margin - logoWidth; logoY = margin - 10; doc.addImage(logoDataUrl!, 'PNG', logoX, logoY, logoWidth, logoHeight); }};
        addLogoIfNeeded();
        if (logoDataUrl) { yPos = Math.max(yPos, (margin - 10) + logoHeight + 10); }

        const addStyledText = (text: string, x: number, currentY: number, options?: any): number => { const fontSize = options?.fontSize || 10; const fontStyle = options?.fontStyle || 'normal'; const lineHeight = fontSize * 1.2; doc.setFontSize(fontSize); doc.setFont('helvetica', fontStyle); const splitText = doc.splitTextToSize(text, maxLineWidth); let newY = currentY; splitText.forEach((line: string) => { if (newY + lineHeight > Math.min(footerStartY, pageHeight - margin)) { doc.addPage(); newY = margin; addLogoIfNeeded(); doc.setFontSize(fontSize); doc.setFont('helvetica', fontStyle); newY = Math.max(newY, (margin - 10) + logoHeight + 10); } doc.text(line, x, newY, options); newY += lineHeight; }); return newY + (fontSize * 0.25); };
        doc.setFont("helvetica", "bold"); yPos = addStyledText(`Study Notes: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`, margin, yPos, { fontSize: 14 }); doc.setLineWidth(0.5); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 15;
        const lines = generatedNotes.split('\n'); const listIndent = margin + 15;
        lines.forEach(line => { const trimmedLine = line.trim(); let consumed = false; let currentFontStyle = 'normal'; let currentFontSize = 10; if (trimmedLine.startsWith('# ')) { yPos = addStyledText(trimmedLine.substring(2), margin, yPos + 5, { fontSize: 16, fontStyle: 'bold' }); consumed = true; } else if (trimmedLine.startsWith('## ')) { yPos = addStyledText(trimmedLine.substring(3), margin, yPos + 4, { fontSize: 14, fontStyle: 'bold' }); consumed = true; } else if (trimmedLine.startsWith('### ')) { yPos = addStyledText(trimmedLine.substring(4), margin, yPos + 3, { fontSize: 12, fontStyle: 'bold' }); consumed = true; } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('+ ')) { const itemText = trimmedLine.substring(2).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'); yPos = addStyledText(`• ${itemText}`, listIndent, yPos); consumed = true; } else if (/^\d+\.\s/.test(trimmedLine)) { const itemText = trimmedLine.substring(trimmedLine.indexOf('.') + 1).trim().replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'); const numPrefix = trimmedLine.substring(0, trimmedLine.indexOf('.') + 1); yPos = addStyledText(`${numPrefix} ${itemText}`, listIndent, yPos); consumed = true; } else if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') { if (yPos + 15 > Math.min(footerStartY, pageHeight - margin)) { doc.addPage(); yPos = margin; addLogoIfNeeded(); } doc.setLineWidth(0.5); doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5); yPos += 15; consumed = true; } else if (trimmedLine.startsWith('> ')) { yPos = addStyledText(trimmedLine.substring(2), margin + 10, yPos, { fontStyle: 'italic' }); consumed = true; } else if (trimmedLine) { const cleanedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '"$1"'); yPos = addStyledText(cleanedLine, margin, yPos); consumed = true; } if (consumed) { yPos += 5; } });
        yPos += 10; doc.setLineWidth(0.2); if (yPos > footerStartY - 20) { doc.addPage(); yPos = margin; addLogoIfNeeded(); } doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 15; doc.setFontSize(8); doc.setFont('helvetica', 'italic');
        if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) { const pageRangeText = `Source Pages (Printed): ${startPage} - ${endPage}`; yPos = addStyledText(pageRangeText, margin, yPos, { fontSize: 8, fontStyle: 'italic' }); yPos += 5; }
        const telegramText = "Join Telegram: https://t.me/grade9to12ethiopia"; if (yPos + 10 > pageHeight - margin) { doc.addPage(); yPos = margin; addLogoIfNeeded();} doc.setTextColor(60, 60, 60); doc.text(telegramText, margin, yPos); doc.setTextColor(0, 0, 0);
        const pageRangeString = (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) ? `_p${startPage}-${endPage}` : '';
        const filename = `${subject.replace(/ /g, '_') || 'Notes'}_Grade${grade || 'N_A'}${pageRangeString}_Notes.pdf`;
        doc.save(filename); toast({ title: "Download Started", description: `Downloading ${filename}`});
      } catch (error) { console.error("Error generating Notes PDF:", error); toast({ title: "PDF Error", description: "Could not generate PDF.", variant: "destructive"}); }
   };

   const handleDownloadQuestionsPdf = async () => { /* ... full implementation ... */ };

   // ** NEW: Custom component for ReactMarkdown to handle table overflow **
    const markdownComponents: Components = {
        table: ({node, ...props}) => (
            <div className="overflow-x-auto w-full my-4 border border-border rounded-md"> {/* Added styling */}
                <table className="min-w-full divide-y divide-border" {...props} />
            </div>
        ),
        // Ensure pre blocks are also handled for overflow by prose or explicitly
        pre: ({node, ...props}) => (
            <div className="overflow-x-auto w-full my-4">
                 <pre {...props} />
            </div>
        ),
        // You can add more overrides here if specific elements cause overflow
    };


  // === Main Component Render ===
  return (
    <>
      {/* Error Display */}
      {componentError && ( <div className="mb-4 md:mb-6 p-4 border border-destructive bg-destructive/10 rounded-lg text-destructive flex items-start text-sm shadow-md"> <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5"/> <div><p className="font-semibold mb-1">Generation Error</p><p>{componentError}</p></div> </div> )}

      {/* Controls Card */}
      <Card className="mb-8 md:mb-10 shadow-lg dark:shadow-slate-800/50 border border-border/50">
        {/* ... CardHeader and CardContent for controls ... */}
      </Card>

      <Separator className="my-8 md:my-10" />

         {/* Content Area Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
             {/* Notes Card */}
             <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px] overflow-hidden">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                     <CardTitle className="text-base md:text-lg flex items-center gap-2"> <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary/80"/> Generated Notes </CardTitle>
                     <Button variant="outline" size="sm" onClick={handleDownloadNotesPdf} disabled={!generatedNotes.trim() || isGeneratingNotes} title="Download Notes as PDF" > <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" /> <span className="hidden sm:inline">Download </span>PDF </Button>
                 </CardHeader>
                 <CardContent className="flex-grow flex flex-col p-0">
                    {isGeneratingNotes && !generatedNotes ? ( <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6 text-center"> <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" /> <p className="text-xs md:text-sm font-medium">{noteGenerationMessage || "Generating notes..."}</p> </div> )
                     : !generatedNotes.trim() ? ( <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-6 text-center"> <FileText size={48} className="mb-4 opacity-50" /> <p className="text-sm font-medium">No Notes Generated</p> <p className="text-xs mt-1">Click "Generate Notes" above or check input.</p> </div> )
                     : (
                         <ScrollArea className="flex-grow w-full rounded-b-lg border-t dark:border-slate-700">
                             <div className="p-5 md:p-8"> {/* Padding here for the overall content */}
                                <ReactMarkdown
                                    className="prose prose-sm sm:prose-base dark:prose-invert max-w-none" // Prose styles applied here
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownComponents} // ** Use custom components **
                                >
                                    {generatedNotes}
                                </ReactMarkdown>
                             </div>
                             <ScrollBar orientation="horizontal" /> {/* Explicit horizontal scrollbar for the entire ScrollArea */}
                         </ScrollArea>
                     )}
                 </CardContent>
             </Card>

             {/* Questions Card */}
             {/* ... Keep the Questions Card JSX the same ... */}
         </div>
        </>
    );
};

export default Dashboard;