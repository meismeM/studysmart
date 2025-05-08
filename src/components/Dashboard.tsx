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

      let logoX = 0, logoY = 0, logoWidth = 0, logoHeight = 0;

      const addLogoIfNeeded = () => {
           if (logoDataUrl) {
               logoWidth = 30; logoHeight = 30;
               logoX = pageWidth - margin - logoWidth;
               logoY = margin - 10;
               doc.addImage(logoDataUrl!, 'PNG', logoX, logoY, logoWidth, logoHeight);
           }
      }

      addLogoIfNeeded();
      if (logoDataUrl) {
          yPos = Math.max(yPos, (margin - 10) + logoHeight + 5);
      }


      const addStyledText = (text: string, x: number, y: number, options?: any): number => {
          const fontSize = options?.fontSize || 10;
          const fontStyle = options?.fontStyle || 'normal';
          const lineHeight = fontSize * 1.2;
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', fontStyle);
          const splitText = doc.splitTextToSize(text, maxLineWidth);
          let newY = y;
          splitText.forEach((line: string) => {
               if (newY + lineHeight > Math.min(footerStartY, pageHeight - margin)) {
                  doc.addPage();
                  newY = margin;
                  addLogoIfNeeded();
                  doc.setFontSize(fontSize);
                  doc.setFont('helvetica', fontStyle);
                  newY = Math.max(newY, (margin - 10) + logoHeight + 5);
               }
               doc.text(line, x, newY, options);
               newY += lineHeight;
          });
           return newY + (fontSize * 0.25);
      };

      doc.setFont("helvetica", "bold");
      yPos = addStyledText(`Study Notes: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`, margin, yPos, { fontSize: 14 });
      doc.setLineWidth(0.5); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 15;

      const lines = generatedNotes.split('\n');
      const listIndent = margin + 15;
      // let currentFontSize = 10; // Removed as not strictly necessary with addStyledText localizing font
      // let currentFontStyle = 'normal'; // Removed as not strictly necessary

      lines.forEach(line => {
          const trimmedLine = line.trim();
          // let consumed = false; // 'consumed' logic was more for direct doc.text, less for addStyledText
          // currentFontStyle = 'normal'; // Reset in addStyledText if not passed
          // currentFontSize = 10; // Reset in addStyledText if not passed

          if (trimmedLine.startsWith('# ')) { yPos = addStyledText(trimmedLine.substring(2), margin, yPos + 5, { fontSize: 16, fontStyle: 'bold' }); }
          else if (trimmedLine.startsWith('## ')) { yPos = addStyledText(trimmedLine.substring(3), margin, yPos + 4, { fontSize: 14, fontStyle: 'bold' }); }
          else if (trimmedLine.startsWith('### ')) { yPos = addStyledText(trimmedLine.substring(4), margin, yPos + 3, { fontSize: 12, fontStyle: 'bold' }); }
          else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('+ ')) { const itemText = trimmedLine.substring(2).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'); yPos = addStyledText(`• ${itemText}`, listIndent, yPos); }
          else if (/^\d+\.\s/.test(trimmedLine)) { const itemText = trimmedLine.substring(trimmedLine.indexOf('.') + 1).trim().replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'); const numPrefix = trimmedLine.substring(0, trimmedLine.indexOf('.') + 1); yPos = addStyledText(`${numPrefix} ${itemText}`, listIndent, yPos); }
          else if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') { if (yPos + 15 > Math.min(footerStartY, pageHeight - margin)) { doc.addPage(); yPos = margin; addLogoIfNeeded(); } doc.setLineWidth(0.5); doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5); yPos += 15; }
          else if (trimmedLine.startsWith('> ')) { yPos = addStyledText(trimmedLine.substring(2), margin + 10, yPos, { fontStyle: 'italic' }); }
          else if (trimmedLine) { const cleanedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '"$1"'); yPos = addStyledText(cleanedLine, margin, yPos); }
      });

      yPos += 10; doc.setLineWidth(0.2);
      if (yPos > footerStartY - 20) { doc.addPage(); yPos = margin; addLogoIfNeeded(); }
      doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 15;
      doc.setFontSize(8); doc.setFont('helvetica', 'italic');
      if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) { const pageRangeText = `Source Pages (Printed): ${startPage} - ${endPage}`; yPos = addStyledText(pageRangeText, margin, yPos, { fontSize: 8, fontStyle: 'italic' }); yPos += 5; }
      const telegramText = "Join Telegram: https://t.me/grade9to12ethiopia";
      if (yPos + 10 > pageHeight - margin) { doc.addPage(); yPos = margin; addLogoIfNeeded();}
      doc.setTextColor(60, 60, 60); doc.text(telegramText, margin, yPos); doc.setTextColor(0, 0, 0);

      const pageRangeString = (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) ? `_p${startPage}-${endPage}` : '';
      const filename = `${subject.replace(/ /g, '_') || 'Notes'}_Grade${grade || 'N_A'}${pageRangeString}_Notes.pdf`;
      doc.save(filename);
      toast({ title: "Download Started", description: `Downloading ${filename}`});

    } catch (error) { console.error("Error generating Notes PDF:", error); toast({ title: "PDF Error", description: "Could not generate PDF.", variant: "destructive"}); }
 };

 const handleDownloadQuestionsPdf = async () => {
      const questionsToDownload = generatedQuestions[activeQuestionTab]; const currentQuestionTypeTitle = questionTypeTitles[activeQuestionTab];
      if (!questionsToDownload || questionsToDownload.length === 0) { toast({ title: "Cannot Download", description: `No ${currentQuestionTypeTitle} questions generated.`, variant: "destructive"}); return; }
      try {
          let logoDataUrl: string | null = null;
          try { logoDataUrl = await loadImageData('/logo.png'); }
          catch (imgError: any) { console.warn("Could not load logo for PDF:", imgError.message); }

          const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
          const pageHeight = doc.internal.pageSize.height; const pageWidth = doc.internal.pageSize.width; const margin = 40; const maxLineWidth = pageWidth - margin * 2; let yPos = margin; const footerStartY = pageHeight - margin - 30;
          let logoX = 0, logoY = 0, logoWidth = 0, logoHeight = 0;

          const addLogoIfNeeded = () => {
               if (logoDataUrl) { logoWidth = 30; logoHeight = 30; logoX = pageWidth - margin - logoWidth; logoY = margin - 10; doc.addImage(logoDataUrl!, 'PNG', logoX, logoY, logoWidth, logoHeight); }
          }

          addLogoIfNeeded();
           if (logoDataUrl) { yPos = Math.max(yPos, (margin - 10) + logoHeight + 5); }

          const addText = (text: string | undefined | null, x: number, y: number, options?: any): number => { if (!text || !text.trim()) return y; const questionLineHeight = (options?.fontSize || 10) * 1.2; doc.setFontSize(options?.fontSize || 10); doc.setFont('helvetica', options?.fontStyle || 'normal'); const split = doc.splitTextToSize(text, (options?.maxWidth || maxLineWidth)); let newY = y; split.forEach((line: string) => { if (newY + questionLineHeight > Math.min(footerStartY, pageHeight - margin) ) { doc.addPage(); newY = margin; addLogoIfNeeded(); doc.setFontSize(options?.fontSize || 10); doc.setFont('helvetica', options?.fontStyle || 'normal'); newY = Math.max(newY, (margin - 10) + logoHeight + 5); } doc.text(line, x, newY, options); newY += questionLineHeight; }); return newY + ((options?.fontSize || 10) * 0.25); };

          doc.setFont("helvetica", "bold"); yPos = addText(`Practice Questions: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`, margin, yPos, { fontSize: 14 }); doc.setFontSize(12); doc.setFont("helvetica", "italic"); yPos = addText(`Type: ${currentQuestionTypeTitle}`, margin, yPos); doc.setLineWidth(0.5); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 15;

          questionsToDownload.forEach((q, index) => {
              if (yPos > pageHeight - (margin + 60)) { doc.addPage(); yPos = margin; addLogoIfNeeded(); }
              doc.setFont("helvetica", "bold"); yPos = addText(`${index + 1}. ${q.question || 'Missing Question Text'}`, margin, yPos, {maxWidth: maxLineWidth}); doc.setFont("helvetica", "normal"); yPos += 5;
              if (activeQuestionTab === 'multiple-choice' && q.options && q.options.length === 4) { q.options.forEach((opt, optIndex) => { const letter = getCorrectAnswerLetter(optIndex); const cleanedOpt = typeof opt === 'string' ? opt.replace(/✓/g, '').trim() : opt; yPos = addText(`${letter}) ${cleanedOpt || 'Missing Option'}`, margin + 15, yPos, {maxWidth: maxLineWidth - 15}); }); yPos += 5; }
               doc.setFont("helvetica", "italic"); yPos += 2; let answerText = 'Answer: Not provided'; if (activeQuestionTab !== 'multiple-choice' && q.answer) { answerText = `Answer: ${q.answer}`; } else if (activeQuestionTab === 'multiple-choice') { let pdfCorrectLetter = null; if (typeof q.answer === 'string' && /^[A-D]$/i.test(q.answer) && typeof q.correctAnswerIndex === 'number') { pdfCorrectLetter = q.answer.toUpperCase(); } else if (q.options) { const derivedIndex = q.options.findIndex(opt => typeof opt === 'string' && opt.includes('✓')); if (derivedIndex !== -1) { pdfCorrectLetter = getCorrectAnswerLetter(derivedIndex); } } if (pdfCorrectLetter) { answerText = `Correct Answer: ${pdfCorrectLetter}`; } else { answerText = `Correct Answer: Could not determine`; } } yPos = addText(answerText, margin + 15, yPos, {maxWidth: maxLineWidth - 15}); doc.setFont("helvetica", "normal"); yPos += 5;
               if (q.explanation) { doc.setFont("helvetica", "italic"); yPos = addText(`Explanation: ${q.explanation}`, margin + 15, yPos, {maxWidth: maxLineWidth - 15}); doc.setFont("helvetica", "normal"); yPos += 5; }
              yPos += 8; if (index < questionsToDownload.length - 1) { if (yPos > Math.min(footerStartY, pageHeight - margin)) { doc.addPage(); yPos = margin; addLogoIfNeeded();} doc.setLineWidth(0.2); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 10; } else { yPos += 5; }
          });

          yPos += 10; doc.setLineWidth(0.2);
          if (yPos > footerStartY - 20) { doc.addPage(); yPos = margin; addLogoIfNeeded(); }
          doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 15;
          doc.setFontSize(8); doc.setFont('helvetica', 'italic');
          if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) { const pageRangeText = `Source Pages (Printed): ${startPage} - ${endPage}`; yPos = addText(pageRangeText, margin, yPos, { fontSize: 8, fontStyle: 'italic'}); yPos += 5; }
          const telegramText = "Join Telegram: https://t.me/grade9to12ethiopia";
          if (yPos + 10 > pageHeight - margin) { doc.addPage(); yPos = margin; addLogoIfNeeded();}
          doc.setTextColor(60, 60, 60); doc.text(telegramText, margin, yPos); doc.setTextColor(0, 0, 0);

          const pageRangeString = (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) ? `_p${startPage}-${endPage}` : '';
          const filename = `${subject.replace(/ /g, '_') || 'Questions'}_Grade${grade || 'N_A'}${pageRangeString}_${activeQuestionTab}_Questions.pdf`;
          doc.save(filename);
          toast({ title: "Download Started", description: `Downloading ${filename}`});
      } catch(error) { console.error("Error generating Questions PDF:", error); toast({ title: "PDF Error", description: "Could not generate PDF.", variant: "destructive"}); }
 };

  // === Main Component Render ===
  return (
    <>
      {/* Error Display */}
      {componentError && ( <div className="mb-4 md:mb-6 p-4 border border-destructive bg-destructive/10 rounded-lg text-destructive flex items-start text-sm shadow-md"> <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5"/> <div><p className="font-semibold mb-1">Generation Error</p><p>{componentError}</p></div> </div> )}

      {/* Controls Card */}
      <Card className="mb-8 md:mb-10 shadow-lg dark:shadow-slate-800/50 border border-border/50">
        <CardHeader className="p-5 md:p-6">
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
             <div className="flex items-center gap-2.5"> <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" /><CardTitle className="text-lg sm:text-xl md:text-2xl">Generate Study Aids</CardTitle></div>
             <p className="text-xs sm:text-sm text-muted-foreground sm:text-right"> Create notes or questions from selected content. </p>
           </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 p-5 md:p-6">
          <Button onClick={handleGenerateNotes} disabled={isGeneratingNotes || !!componentError} size="lg" aria-busy={isGeneratingNotes} className="sm:col-span-1 md:col-span-1" > {isGeneratingNotes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} <span className="hidden sm:inline">Generate </span>Notes </Button>
          {availableQuestionTypes.map((type) => { const title = questionTypeTitles[type]; const isLoading = isGeneratingQuestions[type]; const message = questionGenerationMessage[type]; const Icon = type === 'multiple-choice' ? ListChecks : HelpCircle; return ( <Button key={type} onClick={() => handleGenerateQuestions(type)} disabled={isLoading || !!componentError || isGeneratingNotes} size="lg" aria-busy={isLoading} variant="secondary" className="sm:col-span-1 md:col-span-1" > {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />} {message ? <span className="hidden sm:inline">Generating...</span> : <><span className="hidden sm:inline">Generate </span>{title.replace('Multiple Choice', 'MCQ').replace('Fill-in-the-Blank','FIB').replace('True/False','T/F').replace('Short Answer','Short')}</>} </Button> ); })}
        </CardContent>
      </Card>

      <Separator className="my-8 md:my-10" />

         {/* Content Area Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Notes Card */}
            <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary/80" /> Generated Notes
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadNotesPdf}
                  disabled={!generatedNotes.trim() || isGeneratingNotes}
                  title="Download Notes as PDF"
                >
                  <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />
                  <span className="hidden sm:inline">Download </span>PDF
                </Button>
              </CardHeader>

              <CardContent className="flex-grow flex flex-col p-0">
                {isGeneratingNotes && !generatedNotes ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                    <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" />
                    <p className="text-xs md:text-sm font-medium">{noteGenerationMessage || "Generating notes..."}</p>
                  </div>
                ) : !generatedNotes.trim() ? (
                  <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-6 text-center">
                    <FileText size={48} className="mb-4 opacity-50" />
                    <p className="text-sm font-medium">No Notes Generated</p>
                    <p className="text-xs mt-1">Click "Generate Notes" above or check input.</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-grow w-full rounded-b-lg border-t dark:border-slate-700">
                    <div className="p-5 md:p-8">
                      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              // This div provides the horizontal scroll for an individual table if it's too wide.
                              <div className="my-4 overflow-x-auto rounded-md border dark:border-slate-600">
                                {/*
                                  The table itself. 'prose' styles will generally apply width: 100%
                                  (relative to this scrollable div).
                                  If table content (cells) are intrinsically wider and cannot wrap
                                  enough to fit this 100% width, the div's scrollbar will activate.
                                */}
                                <table {...props} />
                              </div>
                            ),
                          }}
                        >
                          {generatedNotes}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>


             {/* Questions Card */}
             <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                     <CardTitle className="text-base md:text-lg flex items-center gap-2"> <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-primary/80" /> Practice Questions </CardTitle>
                     <Button variant="outline" size="sm" onClick={handleDownloadQuestionsPdf} disabled={(!generatedQuestions[activeQuestionTab] || generatedQuestions[activeQuestionTab].length === 0) || Object.values(isGeneratingQuestions).some(loading => loading)} title={`Download ${questionTypeTitles[activeQuestionTab]} Questions as PDF`} > <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" /> <span className="hidden sm:inline">Download </span>PDF </Button>
                 </CardHeader>
                 <CardContent className="flex-grow flex flex-col pt-2 px-4 pb-4 md:px-6 md:pb-6">
                     <Tabs defaultValue="multiple-choice" value={activeQuestionTab} onValueChange={(value) => setActiveQuestionTab(value as CurrentQuestionTypeValue)} className="w-full flex flex-col flex-grow" >
                         <ScrollArea className="w-full whitespace-nowrap rounded-md mb-5 md:mb-6">
                             <TabsList className="inline-grid w-max grid-cols-4">
                                 {availableQuestionTypes.map((type) => ( <TabsTrigger key={type} value={type} disabled={!!componentError || isGeneratingNotes || isGeneratingQuestions[type]} className="text-xs px-2 sm:px-3" > {questionTypeTitles[type].replace('Multiple Choice', 'MCQ').replace('Fill-in-the-Blank','FIB').replace('Short Answer', 'Short').replace('True/False','T/F')} </TabsTrigger> ))}
                             </TabsList>
                             <ScrollBar orientation="horizontal" />
                         </ScrollArea>
                         <div className="flex-grow relative min-h-[400px] md:min-h-[450px] border rounded-md bg-muted/20 dark:bg-muted/30 overflow-hidden">
                             {availableQuestionTypes.map((type) => { const isLoading = isGeneratingQuestions[type]; const message = questionGenerationMessage[type]; const questions = generatedQuestions[type] ?? []; return ( <TabsContent key={type} value={type} className="absolute inset-0 focus-visible:ring-0 focus-visible:ring-offset-0 m-0" tabIndex={-1}> {isLoading && questions.length === 0 ? ( <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center"> <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" /> <p className="text-xs md:text-sm font-medium">{message || `Generating ${questionTypeTitles[type]}...`}</p> </div> ) : questions.length > 0 ? ( <ScrollArea className="h-full w-full"> <ul className="space-y-5 md:space-y-6 p-5 md:p-8">{questions.map((question, index) => ( <li key={`${type}-${index}`} className="border rounded-lg p-4 md:p-5 shadow-sm bg-background dark:border-slate-700"> <p className="font-medium mb-2 md:mb-3 text-sm md:text-base flex items-start"> <span className="text-primary/90 mr-2 font-semibold">{index + 1}.</span> <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(question.question) }}/> </p> {renderQuestionContent(type, question, index)} </li> ))}</ul> </ScrollArea> ) : ( <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center"> <ListChecks className="h-10 w-10 md:h-12 md:w-12 mb-4 opacity-50"/> <p className="text-xs md:text-sm font-medium">No Questions Yet</p> <p className="text-xs mt-1">Generate some '{questionTypeTitles[type]}' questions!</p> </div> )} </TabsContent> ); })}
                         </div>
                     </Tabs>
                </CardContent>
             </Card>
         </div>
        </>
    );
};

export default Dashboard;
