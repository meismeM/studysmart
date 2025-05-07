// src/components/Dashboard.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  generateStudyQuestions,
  GenerateStudyQuestionsInput,
} from '@/ai/flows/generate-study-questions';
import { generateNotes } from '@/ai/flows/generate-notes';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { jsPDF } from "jspdf";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, EyeOff, Loader2, AlertCircle, FileText, HelpCircle, ListChecks, Sparkles, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { loadImageData } from '@/lib/imageUtils';

// --- Constants and Types ---
type ExplicitQuestionTypeValue =
  | 'multiple-choice'
  | 'short-answer'
  | 'fill-in-the-blank'
  | 'true-false';

const AVAILABLE_QUESTION_TYPES: readonly ExplicitQuestionTypeValue[] = [
  'multiple-choice',
  'short-answer',
  'fill-in-the-blank',
  'true-false',
];
type CurrentQuestionTypeValue = ExplicitQuestionTypeValue;

const QUESTION_TYPE_TITLES: Record<CurrentQuestionTypeValue, string> = {
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

// --- Helper Functions for State Initialization ---
function createInitialRecordState<T>(
  keys: readonly CurrentQuestionTypeValue[],
  defaultValue: T
): Record<CurrentQuestionTypeValue, T> {
  const initialState = {} as Record<CurrentQuestionTypeValue, T>;
  keys.forEach((key) => {
    initialState[key] = defaultValue;
  });
  return initialState;
}

function createInitialNestedRecordState<T>(
  keys: readonly CurrentQuestionTypeValue[]
): Record<CurrentQuestionTypeValue, Record<number, T>> {
  const initialState = {} as Record<CurrentQuestionTypeValue, Record<number, T>>;
  keys.forEach((key) => {
    initialState[key] = {};
  });
  return initialState;
}

// --- Props Interface ---
interface DashboardProps {
  chapterContent: string;
  subject: string;
  grade: string;
  startPage?: number;
  endPage?: number;
}

// --- Component ---
const Dashboard: React.FC<DashboardProps> = ({
  chapterContent: initialChapterContent,
  subject,
  grade,
  startPage,
  endPage,
}) => {
  // === State ===
  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [noteGenerationMessage, setNoteGenerationMessage] = useState<string | null>(null);

  const [generatedQuestions, setGeneratedQuestions] = useState<
    Record<CurrentQuestionTypeValue, Question[]>
  >(() => createInitialRecordState(AVAILABLE_QUESTION_TYPES, []));
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<
    Record<CurrentQuestionTypeValue, boolean>
  >(() => createInitialRecordState(AVAILABLE_QUESTION_TYPES, false));
  const [questionGenerationMessage, setQuestionGenerationMessage] = useState<
    Record<CurrentQuestionTypeValue, string | null>
  >(() => createInitialRecordState<string | null>(AVAILABLE_QUESTION_TYPES, null));

  const [showAnswer, setShowAnswer] = useState<
    Record<CurrentQuestionTypeValue, Record<number, boolean>>
  >(() => createInitialNestedRecordState<boolean>(AVAILABLE_QUESTION_TYPES));

  const [componentError, setComponentError] = useState<string | null>(null);
  const [activeQuestionTab, setActiveQuestionTab] =
    useState<CurrentQuestionTypeValue>('multiple-choice');
  const { toast } = useToast();

  // === Memos for Initial States (used for resetting) ===
  const initialQuestionState = useMemo(
    () => createInitialRecordState(AVAILABLE_QUESTION_TYPES, []),
    []
  );
  const initialLoadingState = useMemo(
    () => createInitialRecordState(AVAILABLE_QUESTION_TYPES, false),
    []
  );
  const initialMessageState = useMemo(
    () => createInitialRecordState<string | null>(AVAILABLE_QUESTION_TYPES, null),
    []
  );
  const initialShowAnswerState = useMemo(
    () => createInitialNestedRecordState<boolean>(AVAILABLE_QUESTION_TYPES),
    []
  );

  // Effect for resetting component state when key props change
  useEffect(() => {
    setChapterContent(initialChapterContent);
    setGeneratedNotes('');
    setIsGeneratingNotes(false);
    setNoteGenerationMessage(null);
    setGeneratedQuestions(initialQuestionState);
    setIsGeneratingQuestions(initialLoadingState);
    setQuestionGenerationMessage(initialMessageState);
    setShowAnswer(initialShowAnswerState);
    setComponentError(null);
    setActiveQuestionTab('multiple-choice');
  }, [
    initialChapterContent,
    subject,
    grade,
    initialQuestionState,
    initialLoadingState,
    initialMessageState,
    initialShowAnswerState,
  ]);

  // === UI Interaction Helpers ===
  const getCorrectAnswerLetter = useCallback((index?: number): string | null => {
    if (typeof index !== 'number' || index < 0 || index > 3) return null;
    return String.fromCharCode(65 + index);
  }, []);

  const toggleShowAnswer = useCallback(
    (questionType: CurrentQuestionTypeValue, index: number) => {
      setShowAnswer((prev) => {
        const currentTypeAnswers = prev[questionType] ?? {};
        return {
          ...prev,
          [questionType]: {
            ...currentTypeAnswers,
            [index]: !currentTypeAnswers[index],
          },
        };
      });
    },
    []
  );

  const validateInputs = useCallback((): boolean => {
    setComponentError(null);
    let isValid = true;
    let errorMsg = '';
    if (!subject || !grade) {
      errorMsg = 'Grade & Subject are required.';
      isValid = false;
    } else if (!chapterContent || chapterContent.trim().length < 20) {
      errorMsg = 'Chapter content is missing or too short (minimum 20 characters).';
      isValid = false;
    }

    if (!isValid) {
      toast({
        title: 'Input Missing',
        description: errorMsg,
        variant: 'destructive',
      });
      setComponentError(errorMsg);
    }
    return isValid;
  }, [subject, grade, chapterContent, toast]);

  // === Content Rendering Helpers ===
  const renderInlineFormatting = useCallback((text: string | null | undefined): string => {
    if (!text) return '';
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '<em>$1</em>');
    html = html.replace(/(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code class="bg-muted text-muted-foreground px-1 py-0.5 rounded font-mono text-sm">$1</code>');
    html = html.replace(/__+/g, '<span class="italic text-muted-foreground">[blank]</span>');
    return html;
  }, []);

  interface McqProcessedDetails {
    cleanedOptions: string[];
    displayCorrectLetter: string | null;
    isDerivedFromSymbol: boolean;
    finalCorrectIndex: number | null;
  }

  const processMcqDetails = useCallback((question: Question): McqProcessedDetails => {
    const rawOptions = question.options ?? [];
    let finalCorrectIndex: number | null = null;
    let displayCorrectLetter: string | null = null;
    let isDerivedFromSymbol = false;

    const cleanedOptions = rawOptions.map(opt =>
      typeof opt === 'string' ? opt.replace(/✓/g, '').trim() : String(opt)
    );

    if (typeof question.correctAnswerIndex === 'number' &&
        question.correctAnswerIndex >= 0 &&
        question.correctAnswerIndex < cleanedOptions.length) {
      finalCorrectIndex = question.correctAnswerIndex;
      displayCorrectLetter = getCorrectAnswerLetter(finalCorrectIndex);
    }
    else if (typeof question.answer === 'string' && /^[A-D]$/i.test(question.answer)) {
      const letterIndex = question.answer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      if (letterIndex >= 0 && letterIndex < cleanedOptions.length) {
        finalCorrectIndex = letterIndex;
        displayCorrectLetter = question.answer.toUpperCase();
      }
    }

    if (finalCorrectIndex === null) {
      const symbolIndex = rawOptions.findIndex(opt => typeof opt === 'string' && opt.includes('✓'));
      if (symbolIndex !== -1 && symbolIndex < cleanedOptions.length) {
        finalCorrectIndex = symbolIndex;
        displayCorrectLetter = getCorrectAnswerLetter(symbolIndex);
        isDerivedFromSymbol = true;
      }
    }
    return { cleanedOptions, displayCorrectLetter, isDerivedFromSymbol, finalCorrectIndex };
  }, [getCorrectAnswerLetter]);


  const renderQuestionContent = useCallback(
    (questionType: CurrentQuestionTypeValue, question: Question, index: number): React.ReactNode => {
      const isShowingAnswer = showAnswer[questionType]?.[index] || false;
      const isMCQ = questionType === 'multiple-choice';

      const AnswerRevealComponent = ({ displayLetter, derivedFromSymbol }: { displayLetter: string | null, derivedFromSymbol?: boolean }) => (
        <div className="mt-3 p-3 md:p-4 bg-muted/70 dark:bg-muted/40 rounded-md border border-border/50 space-y-2 md:space-y-3 text-xs md:text-sm">
          {isMCQ ? (
            displayLetter ? (
              <p className="font-semibold text-green-700 dark:text-green-400">
                Correct Answer: {displayLetter}
                {derivedFromSymbol && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">(Derived from ✓)</span>
                )}
              </p>
            ) : (
              <p className="font-semibold text-orange-600 dark:text-orange-400">
                Correct answer could not be determined.
              </p>
            )
          ) : question.answer?.trim() ? (
            <div>
              <strong className="text-foreground/80 block mb-1">Answer:</strong>
              <span
                className="block pl-2"
                dangerouslySetInnerHTML={{ __html: renderInlineFormatting(question.answer) }}
              />
            </div>
          ) : (
            <p className="font-semibold text-red-600 dark:text-red-400">Answer not provided.</p>
          )}
          {question.explanation?.trim() ? (
            <div className="text-muted-foreground mt-2 pt-2 border-t border-border/30">
              <strong className="text-foreground/80 block mb-1">Explanation:</strong>
              <span
                className="block pl-2"
                dangerouslySetInnerHTML={{ __html: renderInlineFormatting(question.explanation) }}
              />
            </div>
          ) : (
            (isMCQ || questionType === 'true-false') && isShowingAnswer && (
              <p className="text-muted-foreground italic mt-2 pt-2 border-t border-border/30 text-xs">
                Explanation not provided{isMCQ && !displayLetter ? ' (and answer is undetermined)' : ''}.
              </p>
            )
          )}
        </div>
      );

      const RevealButtonComponent = () => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleShowAnswer(questionType, index)}
          className="mt-3 transition-colors text-xs"
        >
          {isShowingAnswer ? (
            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Eye className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isShowingAnswer ? 'Hide' : 'Show'} Answer/Explanation
        </Button>
      );

      if (isMCQ) {
        const { cleanedOptions, displayCorrectLetter, isDerivedFromSymbol, finalCorrectIndex } = processMcqDetails(question);

        return (
          <div className="mt-2 md:mt-3 space-y-1.5 md:space-y-2">
            <ul className="list-none p-0 space-y-1.5 md:space-y-2">
              {cleanedOptions.length === 4 ? (
                cleanedOptions.map((choice, choiceIndex) => {
                  const letter = getCorrectAnswerLetter(choiceIndex);
                  const isCorrectChoice = isShowingAnswer && finalCorrectIndex === choiceIndex;
                  return (
                    <li
                      key={choiceIndex}
                      className={`flex items-center p-2 md:p-2.5 rounded-md border text-xs md:text-sm transition-all duration-150 ease-in-out ${
                        isShowingAnswer
                          ? isCorrectChoice
                            ? 'bg-green-100 dark:bg-green-900/60 border-green-400 dark:border-green-600 font-medium ring-1 ring-green-500'
                            : 'bg-background/70 border-border hover:bg-muted/50'
                          : 'bg-background border-input hover:border-primary/50 hover:bg-muted/40 cursor-pointer'
                      }`}
                    >
                      <span className="font-semibold mr-2 text-primary/80 w-4 md:w-5">{letter ?? '?'}:</span>
                      <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(choice) }} />
                    </li>
                  );
                })
              ) : (
                <li className="text-xs md:text-sm text-red-600 italic p-2 border border-red-300 rounded bg-red-50 dark:bg-red-900/30">
                  Warning: Incorrect number of options ({cleanedOptions.length}). Expected 4.
                </li>
              )}
            </ul>
            <RevealButtonComponent />
            {isShowingAnswer && <AnswerRevealComponent displayLetter={displayCorrectLetter} derivedFromSymbol={isDerivedFromSymbol} />}
          </div>
        );
      } else {
        return (
          <div className="mt-2 md:mt-3">
            <RevealButtonComponent />
            {isShowingAnswer && <AnswerRevealComponent displayLetter={null} />}
          </div>
        );
      }
    },
    [showAnswer, renderInlineFormatting, toggleShowAnswer, getCorrectAnswerLetter, processMcqDetails]
  );


  // === AI Generation Handlers ===
  const handleGenerateNotes = async () => {
    if (!validateInputs()) return;
    setGeneratedNotes('');
    setIsGeneratingNotes(true);
    setNoteGenerationMessage("AI is generating notes...");
    setComponentError(null);

    try {
      const result = await generateNotes({
        textbookChapter: chapterContent,
        gradeLevel: `${grade}th Grade`,
        subject: subject,
      });
      if (result?.notes?.trim()) {
        setGeneratedNotes(result.notes);
        toast({ title: "Success!", description: "Notes generated successfully." });
      } else {
        throw new Error("AI returned empty or invalid notes.");
      }
    } catch (error: any) {
      const msg = error.message || 'An unknown error occurred while generating notes.';
      toast({ title: "Notes Generation Error", description: msg, variant: "destructive" });
      setComponentError(msg);
      setGeneratedNotes('');
    } finally {
      setIsGeneratingNotes(false);
      setNoteGenerationMessage(null);
    }
  };

  const handleGenerateQuestions = async (questionType: CurrentQuestionTypeValue) => {
    if (!validateInputs()) return;
    const typeTitle = QUESTION_TYPE_TITLES[questionType];

    setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] }));
    setShowAnswer(prev => ({ ...prev, [questionType]: {} }));
    setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: true }));
    setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: `AI is generating ${typeTitle}...` }));
    setComponentError(null);

    try {
      const numQuestionsToRequest = 10;
      const inputData: GenerateStudyQuestionsInput = {
        chapterContent: chapterContent,
        questionType: questionType,
        numberOfQuestions: numQuestionsToRequest,
        gradeLevel: `${grade}th Grade`,
        subject: subject,
      };
      const result = await generateStudyQuestions(inputData);

      if (result?.questions && Array.isArray(result.questions)) {
        const questionsReceived = result.questions as Question[];
        if (questionsReceived.length > 0) {
          toast({ title: "Success!", description: `${questionsReceived.length} ${typeTitle} questions generated.` });
        } else {
           toast({ title: "No Questions Generated", description: `AI returned 0 ${typeTitle} questions. This might be due to the content length or topic.`, variant: "default" });
        }
        setGeneratedQuestions(prev => ({ ...prev, [questionType]: questionsReceived }));
      } else {
        throw new Error("Invalid or empty question structure received from AI.");
      }
    } catch (error: any) {
      const msg = error.message || `An unknown error occurred while generating ${typeTitle} questions.`;
      toast({ title: "Question Generation Error", description: msg, variant: "destructive" });
      setComponentError(msg);
      setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] }));
    } finally {
      setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: false }));
      setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: null }));
    }
  };

  // === PDF Download Handlers (Reverted to Original Working Logic) ===

  const handleDownloadNotesPdf = async () => {
    if (!generatedNotes.trim()) {
      toast({ title: "Cannot Download", description: "No notes generated.", variant: "destructive" });
      return;
    }

    try {
      let logoDataUrl: string | null = null;
      try {
        logoDataUrl = await loadImageData('/logo.png');
      } catch (imgError: any) {
        console.warn("Could not load logo for PDF:", imgError.message);
      }

      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 40;
      const maxLineWidth = pageWidth - margin * 2;
      let yPos = margin;
      const footerStartY = pageHeight - margin - 50; 

      let logoWidth = 30, logoHeight = 30;

      const addLogoIfNeeded = () => {
        if (logoDataUrl) {
          const logoX = pageWidth - margin - logoWidth;
          const logoY = margin - 10; 
          doc.addImage(logoDataUrl!, 'PNG', logoX, logoY, logoWidth, logoHeight);
           if (yPos === margin) { 
             yPos = Math.max(yPos, logoY + logoHeight + 10); 
           }
        }
      };

      addLogoIfNeeded(); 

      const addStyledText = (text: string, x: number, currentY: number, options?: any): number => {
        const fontSize = options?.fontSize || 10;
        const fontStyle = options?.fontStyle || 'normal';
        const lineHeight = fontSize * (options?.lineHeightFactor || 1.2); 
        const currentMaxWidth = options?.maxWidth || maxLineWidth;

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        if(options?.color) doc.setTextColor(options.color[0], options.color[1], options.color[2]);
        else doc.setTextColor(0,0,0);


        const splitText = doc.splitTextToSize(text, currentMaxWidth);
        let newY = currentY;

        splitText.forEach((line: string) => {
          if (newY + lineHeight > footerStartY) {
            doc.addPage();
            newY = margin; 
            addLogoIfNeeded(); 
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', fontStyle);
            if(options?.color) doc.setTextColor(options.color[0], options.color[1], options.color[2]);
            else doc.setTextColor(0,0,0);
          }
          doc.text(line, x, newY); 
          newY += lineHeight;
        });
        doc.setTextColor(0,0,0); 
        return newY + (fontSize * 0.25); 
      };

      yPos = addStyledText(`Study Notes: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`, margin, yPos, { fontSize: 14, fontStyle: 'bold' });
      if (yPos + 15 > footerStartY) { doc.addPage(); yPos = margin; addLogoIfNeeded(); } 
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;

      const lines = generatedNotes.split('\n');
      const listIndent = margin + 15;

      lines.forEach(line => {
        const trimmedLine = line.trim();
        let textStyle: any = { fontSize: 10, fontStyle: 'normal' }; 
        let xPos = margin;
        let textToPrint = "";

        if (trimmedLine.startsWith('# ')) { textToPrint = trimmedLine.substring(2); textStyle = { fontSize: 16, fontStyle: 'bold', lineHeightFactor: 1.4 }; }
        else if (trimmedLine.startsWith('## ')) { textToPrint = trimmedLine.substring(3); textStyle = { fontSize: 14, fontStyle: 'bold', lineHeightFactor: 1.3 }; }
        else if (trimmedLine.startsWith('### ')) { textToPrint = trimmedLine.substring(4); textStyle = { fontSize: 12, fontStyle: 'bold' }; }
        else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('+ ')) {
          textToPrint = `• ${trimmedLine.substring(2).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}`;
          xPos = listIndent;
        } else if (/^\d+\.\s/.test(trimmedLine)) {
          const numPrefix = trimmedLine.substring(0, trimmedLine.indexOf('.') + 1);
          textToPrint = `${numPrefix} ${trimmedLine.substring(trimmedLine.indexOf('.') + 1).trim().replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}`;
          xPos = listIndent;
        } else if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
          if (yPos + 15 > footerStartY) { doc.addPage(); yPos = margin; addLogoIfNeeded(); }
          doc.setLineWidth(0.5);
          doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5);
          yPos += 15;
          return; 
        } else if (trimmedLine.startsWith('> ')) {
          textToPrint = trimmedLine.substring(2);
          xPos = margin + 10;
          textStyle = { ...textStyle, fontStyle: 'italic' };
        } else if (trimmedLine) {
          textToPrint = trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '"$1"');
        }

        if (textToPrint) {
          yPos = addStyledText(textToPrint, xPos, yPos, textStyle);
        } else if (!trimmedLine && lines.indexOf(line) < lines.length -1 ) { 
            yPos += (textStyle.fontSize || 10) * 0.5; 
            if (yPos > footerStartY) { 
                doc.addPage(); yPos = margin; addLogoIfNeeded();
            }
        }
      });

      if (yPos < footerStartY) {
          yPos = footerStartY;
      }
      if (yPos + 40 > pageHeight - margin) { 
          doc.addPage(); yPos = margin; addLogoIfNeeded();
          yPos = footerStartY;
      }

      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;

      if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) {
        const pageRangeText = `Source Pages (Printed): ${startPage} - ${endPage}`;
        yPos = addStyledText(pageRangeText, margin, yPos, { fontSize: 8, fontStyle: 'italic' });
      }
      const telegramText = "Join Telegram: https://t.me/grade9to12ethiopia";
      yPos = addStyledText(telegramText, margin, yPos, { fontSize: 8, fontStyle: 'italic', color: [60, 60, 60] });

      const pageRangeString = (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) ? `_p${startPage}-${endPage}` : '';
      const filename = `${subject.replace(/ /g, '_') || 'Notes'}_Grade${grade || 'N_A'}${pageRangeString}_Notes.pdf`;
      doc.save(filename);
      toast({ title: "Download Started", description: `Downloading ${filename}` });

    } catch (error) {
      console.error("Error generating Notes PDF:", error);
      toast({ title: "PDF Error", description: "Could not generate PDF for notes.", variant: "destructive" });
    }
  };

  const handleDownloadQuestionsPdf = async () => {
    const questionsToDownload = generatedQuestions[activeQuestionTab];
    const currentQuestionTypeTitle = QUESTION_TYPE_TITLES[activeQuestionTab];
    if (!questionsToDownload || questionsToDownload.length === 0) {
      toast({ title: "Cannot Download", description: `No ${currentQuestionTypeTitle} questions generated.`, variant: "destructive" });
      return;
    }
    try {
      let logoDataUrl: string | null = null;
      try {
        logoDataUrl = await loadImageData('/logo.png');
      } catch (imgError: any) {
        console.warn("Could not load logo for PDF:", imgError.message);
      }

      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 40;
      const maxLineWidth = pageWidth - margin * 2;
      let yPos = margin;
      const footerStartY = pageHeight - margin - 60; 

      let logoWidth = 30, logoHeight = 30;

      const addLogoIfNeeded = () => {
        if (logoDataUrl) {
          const logoX = pageWidth - margin - logoWidth;
          const logoY = margin - 10;
          doc.addImage(logoDataUrl!, 'PNG', logoX, logoY, logoWidth, logoHeight);
           if (yPos === margin) {
             yPos = Math.max(yPos, logoY + logoHeight + 10);
           }
        }
      };
      
      addLogoIfNeeded();

      const addText = (text: string | undefined | null, x: number, currentY: number, options?: any): number => {
        if (!text || !text.trim()) return currentY;
        const fontSize = options?.fontSize || 10;
        const fontStyle = options?.fontStyle || 'normal';
        const lineHeight = fontSize * (options?.lineHeightFactor || 1.2);
        const currentMaxWidth = options?.maxWidth || maxLineWidth;
        
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        if(options?.color) doc.setTextColor(options.color[0], options.color[1], options.color[2]);
        else doc.setTextColor(0,0,0);

        const split = doc.splitTextToSize(text, currentMaxWidth);
        let newY = currentY;
        split.forEach((line: string) => {
          if (newY + lineHeight > footerStartY) { 
            doc.addPage();
            newY = margin;
            addLogoIfNeeded();
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', fontStyle);
            if(options?.color) doc.setTextColor(options.color[0], options.color[1], options.color[2]);
            else doc.setTextColor(0,0,0);
          }
          doc.text(line, x, newY);
          newY += lineHeight;
        });
        doc.setTextColor(0,0,0); 
        return newY + (fontSize * 0.25); 
      };

      yPos = addText(`Practice Questions: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`, margin, yPos, { fontSize: 14, fontStyle: 'bold' });
      yPos = addText(`Type: ${currentQuestionTypeTitle}`, margin, yPos, { fontSize: 12, fontStyle: 'italic' });
      if (yPos + 15 > footerStartY) { doc.addPage(); yPos = margin; addLogoIfNeeded(); }
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;

      questionsToDownload.forEach((q, index) => {
        if (yPos + 80 > footerStartY && index > 0) { 
             doc.addPage(); yPos = margin; addLogoIfNeeded();
        }

        yPos = addText(`${index + 1}. ${q.question || 'Missing Question Text'}`, margin, yPos, { fontStyle: 'bold', maxWidth: maxLineWidth });
        yPos += 5; 

        if (activeQuestionTab === 'multiple-choice' && q.options) {
            const { cleanedOptions } = processMcqDetails(q); 
            cleanedOptions.forEach((opt, optIndex) => {
            const letter = getCorrectAnswerLetter(optIndex);
            yPos = addText(`${letter}) ${opt || 'Missing Option'}`, margin + 15, yPos, { maxWidth: maxLineWidth - 15 });
          });
          yPos += 5; 
        }
        
        let answerText = 'Answer: Not provided';
        if (activeQuestionTab !== 'multiple-choice' && q.answer) {
          answerText = `Answer: ${q.answer}`;
        } else if (activeQuestionTab === 'multiple-choice') {
          const { displayCorrectLetter } = processMcqDetails(q); 
          answerText = displayCorrectLetter ? `Correct Answer: ${displayCorrectLetter}` : 'Correct Answer: Could not determine';
        }
        yPos = addText(answerText, margin + 15, yPos, { fontStyle: 'italic', maxWidth: maxLineWidth - 15 });
        
        if (q.explanation) {
          yPos = addText(`Explanation: ${q.explanation}`, margin + 15, yPos, { fontStyle: 'italic', maxWidth: maxLineWidth - 15 });
        }
        yPos += 8; 

        if (index < questionsToDownload.length - 1) {
          if (yPos + 10 > footerStartY) { 
             doc.addPage(); yPos = margin; addLogoIfNeeded();
          } else {
            doc.setLineWidth(0.2);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10; 
          }
        }
      });

      if (yPos < footerStartY) { 
          yPos = footerStartY;
      }
       if (yPos + 40 > pageHeight - margin) { 
          doc.addPage(); yPos = margin; addLogoIfNeeded();
          yPos = footerStartY; 
      }

      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;

      if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) {
        const pageRangeText = `Source Pages (Printed): ${startPage} - ${endPage}`;
        yPos = addText(pageRangeText, margin, yPos, { fontSize: 8, fontStyle: 'italic' });
      }
      const telegramText = "Join Telegram: https://t.me/grade9to12ethiopia";
      yPos = addText(telegramText, margin, yPos, { fontSize: 8, fontStyle: 'italic', color: [60, 60, 60] });

      const pageRangeString = (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) ? `_p${startPage}-${endPage}` : '';
      const filename = `${subject.replace(/ /g, '_') || 'Questions'}_Grade${grade || 'N_A'}${pageRangeString}_${activeQuestionTab}_Questions.pdf`;
      doc.save(filename);
      toast({ title: "Download Started", description: `Downloading ${filename}` });
    } catch (error) {
      console.error("Error generating Questions PDF:", error);
      toast({ title: "PDF Error", description: "Could not generate PDF for questions.", variant: "destructive" });
    }
  };

  // === Main Component Render ===
  return (
    <>
      {/* Error Display */}
      {componentError && (
        <div className="mb-4 md:mb-6 p-4 border border-destructive bg-destructive/10 rounded-lg text-destructive flex items-start text-sm shadow-md">
          <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Generation Error</p>
            <p>{componentError}</p>
          </div>
        </div>
      )}

      {/* Controls Card */}
      <Card className="mb-8 md:mb-10 shadow-lg dark:shadow-slate-800/50 border border-border/50">
        <CardHeader className="p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <CardTitle className="text-lg sm:text-xl md:text-2xl">Generate Study Aids</CardTitle>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground sm:text-right">
              Create notes or questions from the chapter content.
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 p-5 md:p-6">
          <Button
            onClick={handleGenerateNotes}
            disabled={isGeneratingNotes || !!componentError}
            size="lg"
            aria-busy={isGeneratingNotes}
            className="sm:col-span-1 md:col-span-1"
          >
            {isGeneratingNotes ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">Generate </span>Notes
          </Button>
          {AVAILABLE_QUESTION_TYPES.map((type) => {
            const title = QUESTION_TYPE_TITLES[type];
            const isLoading = isGeneratingQuestions[type];
            const message = questionGenerationMessage[type];
            const Icon = type === 'multiple-choice' ? ListChecks : HelpCircle;
            return (
              <Button
                key={type}
                onClick={() => handleGenerateQuestions(type)}
                disabled={isLoading || !!componentError || isGeneratingNotes}
                size="lg"
                aria-busy={isLoading}
                variant="secondary"
                className="sm:col-span-1 md:col-span-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="mr-2 h-4 w-4" />
                )}
                {message ? (
                  <span className="hidden sm:inline">Generating...</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">Generate </span>
                    {title.replace('Multiple Choice', 'MCQ')
                          .replace('Fill-in-the-Blank','FIB')
                          .replace('True/False','T/F')
                          .replace('Short Answer','Short')}
                  </>
                )}
              </Button>
            );
          })}
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
                <p className="text-xs md:text-sm font-medium">
                  {noteGenerationMessage || "Generating notes..."}
                </p>
              </div>
            ) : !generatedNotes.trim() ? (
              <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-6 text-center">
                <FileText size={48} className="mb-4 opacity-50" />
                <p className="text-sm font-medium">No Notes Generated</p>
                <p className="text-xs mt-1">Click "Generate Notes" or check chapter content.</p>
              </div>
            ) : (
              <ScrollArea className="flex-grow w-full rounded-b-lg border-t dark:border-slate-700">
                <div className="p-5 md:p-8 overflow-auto">
                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto"><table {...props} /></div>
                        ),
                      }}
                    >
                      {generatedNotes}
                    </ReactMarkdown>
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Questions Card */}
        <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-primary/80" /> Practice Questions
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQuestionsPdf}
              disabled={
                (!generatedQuestions[activeQuestionTab] || generatedQuestions[activeQuestionTab].length === 0) ||
                Object.values(isGeneratingQuestions).some(loading => loading)
              }
              title={`Download ${QUESTION_TYPE_TITLES[activeQuestionTab]} Questions as PDF`}
            >
              <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />
              <span className="hidden sm:inline">Download </span>PDF
            </Button>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col pt-2 px-4 pb-4 md:px-6 md:pb-6">
            <Tabs
              defaultValue="multiple-choice"
              value={activeQuestionTab}
              onValueChange={(value) => setActiveQuestionTab(value as CurrentQuestionTypeValue)}
              className="w-full flex flex-col flex-grow"
            >
              <ScrollArea className="w-full whitespace-nowrap rounded-md mb-5 md:mb-6">
                <TabsList className="inline-grid w-max grid-cols-4">
                  {AVAILABLE_QUESTION_TYPES.map((type) => (
                    <TabsTrigger
                      key={type}
                      value={type}
                      disabled={!!componentError || isGeneratingNotes || isGeneratingQuestions[type]}
                      className="text-xs px-2 sm:px-3"
                    >
                      {QUESTION_TYPE_TITLES[type].replace('Multiple Choice', 'MCQ')
                                                  .replace('Fill-in-the-Blank','FIB')
                                                  .replace('Short Answer', 'Short')
                                                  .replace('True/False','T/F')}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <div className="flex-grow relative min-h-[400px] md:min-h-[450px] border rounded-md bg-muted/20 dark:bg-muted/30 overflow-hidden">
                {AVAILABLE_QUESTION_TYPES.map((type) => {
                  const isLoading = isGeneratingQuestions[type];
                  const message = questionGenerationMessage[type];
                  const questions = generatedQuestions[type] ?? [];
                  return (
                    <TabsContent
                      key={type}
                      value={type}
                      className="absolute inset-0 focus-visible:ring-0 focus-visible:ring-offset-0 m-0"
                      tabIndex={-1} 
                    >
                      {isLoading && questions.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center">
                          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" />
                          <p className="text-xs md:text-sm font-medium">
                            {message || `Generating ${QUESTION_TYPE_TITLES[type]}...`}
                          </p>
                        </div>
                      ) : questions.length > 0 ? (
                        <ScrollArea className="h-full w-full">
                          <ul className="space-y-5 md:space-y-6 p-5 md:p-8">
                            {questions.map((question, index) => (
                              <li
                                key={`${type}-${index}`}
                                className="border rounded-lg p-4 md:p-5 shadow-sm bg-background dark:border-slate-700"
                              >
                                <p className="font-medium mb-2 md:mb-3 text-sm md:text-base flex items-start">
                                  <span className="text-primary/90 mr-2 font-semibold">{index + 1}.</span>
                                  <span
                                    className="flex-1"
                                    dangerouslySetInnerHTML={{ __html: renderInlineFormatting(question.question) }}
                                  />
                                </p>
                                {renderQuestionContent(type, question, index)}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center">
                          <ListChecks className="h-10 w-10 md:h-12 md:w-12 mb-4 opacity-50" />
                          <p className="text-xs md:text-sm font-medium">No Questions Yet</p>
                          <p className="text-xs mt-1">
                            Click "Generate {QUESTION_TYPE_TITLES[type]}" to create some!
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Dashboard;
