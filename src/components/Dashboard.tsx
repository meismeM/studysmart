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
import { loadImageData } from '@/lib/imageUtils';

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
const Dashboard: React.FC<DashboardProps> = ({ chapterContent: initialChapterContent, subject, grade, startPage, endPage }) => {
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
  const renderQuestionContent = ( questionType: CurrentQuestionTypeValue, question: Question, index: number ): React.ReactNode => { /* ... full implementation ... */ };

  // === Generation Handlers ===
  const handleGenerateNotes = async () => { /* ... full implementation ... */ };
  const handleGenerateQuestions = async (questionType: CurrentQuestionTypeValue) => { /* ... full implementation ... */ };

  // === PDF Download Handlers ===
   const handleDownloadNotesPdf = async () => { /* ... full implementation with logo & footer ... */ };
   const handleDownloadQuestionsPdf = async () => { /* ... full implementation with logo & footer ... */ };

   // ** NEW: Custom component for ReactMarkdown to handle table overflow **
    const markdownComponents: Components = {
        table: ({node, ...props}) => (
            <div className="overflow-x-auto w-full">
                <table {...props} />
            </div>
        ),
        // You can add overrides for other elements here if needed
        // For example, to ensure pre blocks are always scrollable by the prose plugin
        // pre: ({node, ...props}) => <pre {...props} className="overflow-x-auto" />,
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
             <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px] overflow-hidden"> {/* Added overflow-hidden to Card */}
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                     <CardTitle className="text-base md:text-lg flex items-center gap-2"> <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary/80"/> Generated Notes </CardTitle>
                     <Button variant="outline" size="sm" onClick={handleDownloadNotesPdf} disabled={!generatedNotes.trim() || isGeneratingNotes} title="Download Notes as PDF" > <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" /> <span className="hidden sm:inline">Download </span>PDF </Button>
                 </CardHeader>
                 <CardContent className="flex-grow flex flex-col p-0">
                    {isGeneratingNotes && !generatedNotes ? ( <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6 text-center"> <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" /> <p className="text-xs md:text-sm font-medium">{noteGenerationMessage || "Generating notes..."}</p> </div> )
                     : !generatedNotes.trim() ? ( <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-6 text-center"> <FileText size={48} className="mb-4 opacity-50" /> <p className="text-sm font-medium">No Notes Generated</p> <p className="text-xs mt-1">Click "Generate Notes" above or check input.</p> </div> )
                     : (
                         <ScrollArea className="flex-grow w-full rounded-b-lg border-t dark:border-slate-700">
                             {/* The div with prose classes will be the scrollable content */}
                             <div className="p-5 md:p-8"> {/* Padding inside scroll area */}
                                <ReactMarkdown
                                    // Apply prose classes to the root element generated by ReactMarkdown
                                    className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownComponents} // ** Use custom components for table handling **
                                >
                                    {generatedNotes}
                                </ReactMarkdown>
                             </div>
                             <ScrollBar orientation="horizontal" /> {/* Explicit horizontal scrollbar */}
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