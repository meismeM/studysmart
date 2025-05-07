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
import ReactMarkdown, { Components } from 'react-markdown'; // Import Components type if needed for customization
import remarkGfm from 'remark-gfm';
import { Eye, EyeOff, Loader2, AlertCircle, FileText, HelpCircle, ListChecks, Sparkles, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { loadImageData } from '@/lib/imageUtils'; // Import the helper function

// --- Constants and Types ---
type ExplicitQuestionTypeValue =
  | 'multiple-choice'
  | 'short-answer'
  | 'fill-in-the-blank'
  | 'true-false';
const availableQuestionTypes: readonly ExplicitQuestionTypeValue[] = [
  'multiple-choice',
  'short-answer',
  'fill-in-the-blank',
  'true-false',
];
type CurrentQuestionTypeValue = ExplicitQuestionTypeValue;

const questionTypeTitles: Record<CurrentQuestionTypeValue, string> = {
  'multiple-choice': 'Multiple Choice',
  'short-answer': 'Short Answer',
  'fill-in-the-blank': 'Fill-in-the-Blank',
  'true-false': 'True/False',
};

type Question = {
  question: string;
  answer?: string;
  options?: string[];
  correctAnswerIndex?: number;
  explanation?: string;
};

// --- Helper Functions ---
function createInitialRecordState<T>(keys: readonly CurrentQuestionTypeValue[], defaultValue: T): Record<CurrentQuestionTypeValue, T> { const initialState = {} as Record<CurrentQuestionTypeValue, T>; keys.forEach((key) => { initialState[key] = defaultValue; }); return initialState; }
function createInitialNestedRecordState<T>(keys: readonly CurrentQuestionTypeValue[]): Record<CurrentQuestionTypeValue, Record<number, T>> { const initialState = {} as Record< CurrentQuestionTypeValue, Record<number, T> >; keys.forEach((key) => { initialState[key] = {}; }); return initialState; }

// --- Props Interface ---
interface DashboardProps {
  chapterContent: string;
  subject: string;
  grade: string;
  startPage?: number; // Page numbers are optional props received from parent
  endPage?: number;
}

// --- Component ---
const Dashboard: React.FC<DashboardProps> = ({
  chapterContent: initialChapterContent,
  subject,
  grade,
  startPage, // Destructure page numbers
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
  const renderQuestionContent = ( questionType: CurrentQuestionTypeValue, question: Question, index: number ): React.ReactNode => {
    const isShowingAnswer = showAnswer[questionType]?.[index] || false;
    const isMCQ = questionType === 'multiple-choice';
    const AnswerReveal = ({ derivedLetter, originalLetter }: { derivedLetter: string | null, originalLetter: string | null }) => { const displayLetter = isMCQ ? (derivedLetter ?? originalLetter) : null; return ( <div className="mt-3 p-3 md:p-4 bg-muted/70 dark:bg-muted/40 rounded-md border border-border/50 space-y-2 md:space-y-3 text-xs md:text-sm"> {isMCQ ? ( displayLetter ? ( <p className="font-semibold text-green-700 dark:text-green-400"> Correct Answer: {displayLetter} {derivedLetter && !originalLetter && ( <span className="text-xs font-normal text-muted-foreground ml-2">(Derived from ✓)</span> )} </p> ) : ( <p className="font-semibold text-orange-600 dark:text-orange-400"> Correct answer could not be determined. </p> ) ) : question.answer?.trim() ? ( <div> <strong className="text-foreground/80 block mb-1">Answer:</strong> <span className="block pl-2" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(question.answer), }} /> </div> ) : ( <p className="font-semibold text-red-600 dark:text-red-400"> Answer not provided. </p> )} {question.explanation?.trim() ? ( <div className="text-muted-foreground mt-2 pt-2 border-t border-border/30"> <strong className="text-foreground/80 block mb-1">Explanation:</strong> <span className="block pl-2" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(question.explanation), }} /> </div> ) : ( (isMCQ || questionType === 'true-false') && isShowingAnswer && <p className="text-muted-foreground italic mt-2 pt-2 border-t border-border/30 text-xs"> Explanation not provided{isMCQ && !displayLetter ? ' (and answer is undetermined)' : ''}. </p> )} </div> ); };
    const RevealButton = () => ( <Button variant="outline" size="sm" onClick={() => toggleShowAnswer(questionType, index)} className="mt-3 transition-colors text-xs"> {isShowingAnswer ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />} {isShowingAnswer ? 'Hide' : 'Show'} Answer/Explanation </Button> );
    if (isMCQ) { const options = question.options ?? []; let derivedCorrectIndex: number | null = null; let derivedCorrectLetter: string | null = null; let cleanedOptions = options; let originalCorrectLetter = (typeof question.answer === 'string' && /^[A-D]$/i.test(question.answer)) ? question.answer.toUpperCase() : null; let originalCorrectIndex = (typeof question.correctAnswerIndex === 'number' && question.correctAnswerIndex >= 0 && question.correctAnswerIndex < 4) ? question.correctAnswerIndex : null; if (originalCorrectLetter === null || originalCorrectIndex === null || options.length !== 4) { cleanedOptions = options.map((opt, optIndex) => { if (typeof opt === 'string' && opt.includes('✓')) { if (derivedCorrectIndex === null) { derivedCorrectIndex = optIndex; derivedCorrectLetter = getCorrectAnswerLetter(optIndex); } return opt.replace(/✓/g, '').trim(); } return opt; }); if (derivedCorrectIndex !== null) { originalCorrectLetter = null; originalCorrectIndex = null; } } else { cleanedOptions = options.map(opt => typeof opt === 'string' ? opt.replace(/✓/g, '').trim() : opt); } const finalCorrectIndex = derivedCorrectIndex ?? originalCorrectIndex; const finalOriginalLetterForReveal = originalCorrectLetter; const finalDerivedLetterForReveal = derivedCorrectLetter; return ( <div className="mt-2 md:mt-3 space-y-1.5 md:space-y-2"> <ul className="list-none p-0 space-y-1.5 md:space-y-2"> {cleanedOptions.length === 4 ? ( cleanedOptions.map((choice, choiceIndex) => { const L = getCorrectAnswerLetter(choiceIndex); const isCorrect = isShowingAnswer && finalCorrectIndex === choiceIndex; return ( <li key={choiceIndex} className={`flex items-center p-2 md:p-2.5 rounded-md border text-xs md:text-sm transition-all duration-150 ease-in-out ${ isShowingAnswer ? isCorrect ? 'bg-green-100 dark:bg-green-900/60 border-green-400 dark:border-green-600 font-medium ring-1 ring-green-500' : 'bg-background/70 border-border hover:bg-muted/50' : 'bg-background border-input hover:border-primary/50 hover:bg-muted/40 cursor-pointer' }`}> <span className="font-semibold mr-2 text-primary/80 w-4 md:w-5">{L ?? '?'}:</span> <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(choice) }} /> </li> ); }) ) : ( <li className="text-xs md:text-sm text-red-600 italic p-2 border border-red-300 rounded bg-red-50 dark:bg-red-900/30"> Warning: Incorrect number of options ({cleanedOptions.length}). </li> )} </ul> <RevealButton /> {isShowingAnswer && <AnswerReveal derivedLetter={finalDerivedLetterForReveal} originalLetter={finalOriginalLetterForReveal} />} </div> ); }
    else { return ( <div className="mt-2 md:mt-3"> <RevealButton /> {isShowingAnswer && <AnswerReveal derivedLetter={null} originalLetter={null} />} </div> ); }
  };

  // === Generation Handlers ===
  const handleGenerateNotes = async () => { if (!validateInputs()) return; setGeneratedNotes(''); setIsGeneratingNotes(true); setNoteGenerationMessage("AI generating notes..."); try { const result = await generateNotes({ textbookChapter: chapterContent, gradeLevel: `${grade}th Grade`, subject: subject }); if (result?.notes?.trim()) { setGeneratedNotes(result.notes); toast({ title: "Success!", description: "Notes generated." }); } else { throw new Error("AI returned empty notes."); } } catch (error: any) { const msg = error.message || 'Unknown error.'; toast({ title: "Notes Error", description: msg, variant: "destructive" }); setComponentError(msg); setGeneratedNotes(''); } finally { setIsGeneratingNotes(false); setNoteGenerationMessage(null); } };
  const handleGenerateQuestions = async (questionType: CurrentQuestionTypeValue) => { if (!validateInputs()) return; const typeTitle = questionTypeTitles[questionType]; setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] })); setShowAnswer(prev => ({ ...prev, [questionType]: {} })); setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: true })); setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: `AI generating ${typeTitle}...` })); setComponentError(null); try { const numQuestionsToRequest = 10; const inputData: GenerateStudyQuestionsInput = { chapterContent: chapterContent, questionType: questionType, numberOfQuestions: numQuestionsToRequest, gradeLevel: `${grade}th Grade`, subject: subject }; const result = await generateStudyQuestions(inputData); if (result?.questions && Array.isArray(result.questions)) { const questionsReceived = result.questions as Question[]; if (questionsReceived.length > 0 || numQuestionsToRequest === 10) { toast({ title: "Success!", description: `${questionsReceived.length} ${typeTitle} questions generated.` }); setGeneratedQuestions(prev => ({ ...prev, [questionType]: questionsReceived })); } else { toast({ title: "No Questions", description: `AI returned 0 ${typeTitle} questions.`, variant: "default" }); setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] })); } } else { throw new Error("Invalid question structure received."); } } catch (error: any) { const msg = error.message || `Unknown error.`; toast({ title: "Question Error", description: msg, variant: "destructive" }); setComponentError(msg); setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] })); } finally { setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: false })); setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: null })); } };

  // === PDF Download Handlers (Corrected Scope and Markdown Processing) ===
  const handleDownloadNotesPdf = async () => {
    if (!generatedNotes.trim()) { toast({ title: "Cannot Download", description: "No notes generated.", variant: "destructive"}); return; }

    try {
      let logoDataUrl: string | null = null;
      try { logoDataUrl = await loadImageData('/logo.png'); }
      catch (imgError: any) { console.warn("Could not load logo for PDF:", imgError.message); }

      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 40;
      const maxLineWidth = pageWidth - margin * 2;
      let yPos = margin;
      const footerStartY = pageHeight - margin - 30; // Start footer content higher up

      // ** FIX: Define logo variables in the outer scope **
      let logoX = 0, logoY = 0, logoWidth = 0, logoHeight = 0;

      // Function to add logo (avoids repetition)
      const addLogoIfNeeded = () => {
           if (logoDataUrl) {
               // Recalculate position in case of new page
               logoWidth = 30; logoHeight = 30;
               logoX = pageWidth - margin - logoWidth;
               logoY = margin - 10; // Keep consistent Y position relative to top margin
               doc.addImage(logoDataUrl!, 'PNG', logoX, logoY, logoWidth, logoHeight);
           }
      }

      // --- Add Logo on First Page (if loaded) ---
      addLogoIfNeeded(); // Add logo to the first page
      if (logoDataUrl) {
          yPos = Math.max(yPos, (margin - 10) + logoHeight + 5); // Adjust starting yPos if logo was added
      }


      // Helper to add text, checking page breaks against footer AND adding logo on new page
      const addStyledText = (text: string, x: number, y: number, options?: any): number => {
          const fontSize = options?.fontSize || 10;
          const fontStyle = options?.fontStyle || 'normal';
          const lineHeight = fontSize * 1.2;
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', fontStyle);
          const splitText = doc.splitTextToSize(text, maxLineWidth);
          let newY = y;
          splitText.forEach((line: string) => {
               // Check if NEXT line would go past footer start area or page bottom
               if (newY + lineHeight > Math.min(footerStartY, pageHeight - margin)) {
                  doc.addPage();
                  newY = margin; // Reset Y position
                  addLogoIfNeeded(); // ** Add logo on new page **
                  // Re-apply font on new page
                  doc.setFontSize(fontSize);
                  doc.setFont('helvetica', fontStyle);
                  newY = Math.max(newY, (margin - 10) + logoHeight + 5); // Ensure text starts below logo on new page
               }
               doc.text(line, x, newY, options);
               newY += lineHeight;
          });
           return newY + (fontSize * 0.25); // Return Y pos after adding text + small gap
      };

      // --- Add Title/Header ---
      doc.setFont("helvetica", "bold");
      yPos = addStyledText(`Study Notes: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`, margin, yPos, { fontSize: 14 });
      doc.setLineWidth(0.5); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 15;

      // --- ** FIX: Process Markdown Content ** ---
      const lines = generatedNotes.split('\n');
      const listIndent = margin + 15;
      let currentFontSize = 10; // Reset default font size for content
      let currentFontStyle = 'normal';

      lines.forEach(line => {
          const trimmedLine = line.trim();
          let consumed = false;
          currentFontStyle = 'normal'; // Reset style for each line unless overridden
          currentFontSize = 10;

          if (trimmedLine.startsWith('# ')) { yPos = addStyledText(trimmedLine.substring(2), margin, yPos + 5, { fontSize: 16, fontStyle: 'bold' }); consumed = true; }
          else if (trimmedLine.startsWith('## ')) { yPos = addStyledText(trimmedLine.substring(3), margin, yPos + 4, { fontSize: 14, fontStyle: 'bold' }); consumed = true; }
          else if (trimmedLine.startsWith('### ')) { yPos = addStyledText(trimmedLine.substring(4), margin, yPos + 3, { fontSize: 12, fontStyle: 'bold' }); consumed = true; }
          else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('+ ')) { const itemText = trimmedLine.substring(2).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'); yPos = addStyledText(`• ${itemText}`, listIndent, yPos); consumed = true; }
          else if (/^\d+\.\s/.test(trimmedLine)) { const itemText = trimmedLine.substring(trimmedLine.indexOf('.') + 1).trim().replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'); const numPrefix = trimmedLine.substring(0, trimmedLine.indexOf('.') + 1); yPos = addStyledText(`${numPrefix} ${itemText}`, listIndent, yPos); consumed = true; }
          else if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') { if (yPos + 15 > Math.min(footerStartY, pageHeight - margin)) { doc.addPage(); yPos = margin; addLogoIfNeeded(); } doc.setLineWidth(0.5); doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5); yPos += 15; consumed = true; }
          else if (trimmedLine.startsWith('> ')) { yPos = addStyledText(trimmedLine.substring(2), margin + 10, yPos, { fontStyle: 'italic' }); consumed = true; }
          else if (trimmedLine) { const cleanedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '"$1"'); yPos = addStyledText(cle