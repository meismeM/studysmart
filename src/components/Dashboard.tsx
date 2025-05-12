// src/components/Dashboard.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
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
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, EyeOff, Loader2, AlertCircle, FileText, HelpCircle, ListChecks, Sparkles, Download, CheckCircle, XCircle, Save, Send, History, Trash2, FileQuestion } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { loadImageData } from '@/lib/imageUtils';
import html2canvas from 'html2canvas';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

// --- Constants and Types ---
type ExplicitQuestionTypeValue = | 'multiple-choice' | 'short-answer' | 'fill-in-the-blank' | 'true-false';
const availableQuestionTypes: readonly ExplicitQuestionTypeValue[] = [ 'multiple-choice', 'short-answer', 'fill-in-the-blank', 'true-false', ];
type CurrentQuestionTypeValue = ExplicitQuestionTypeValue;
const questionTypeTitles: Record<CurrentQuestionTypeValue, string> = { 
    'multiple-choice': 'Multiple Choice', 'short-answer': 'Short Answer', 
    'fill-in-the-blank': 'Fill-in-the-Blank', 'true-false': 'True/False', 
};

type Question = { 
  question: string; 
  answer?: string; 
  options?: string[]; 
  correctAnswerIndex?: number;
  explanation?: string; 
};

type SavedQuestionSet = {
    questionType: CurrentQuestionTypeValue;
    questions: Question[];
    selectedAnswers?: Record<number, number | undefined>;
    isSubmitted?: boolean;
    score?: { userScore: number, scorableQuestions: number, totalQuestions: number } | null;
    timestamp: number;
    subject: string; grade: string; startPage?: number; endPage?: number; 
    chapterContentSnippet?: string;
};
type SavedNote = {
    notes: string;
    timestamp: number;
    subject: string; grade: string; startPage?: number; endPage?: number;
    chapterContentSnippet?: string;
};

// --- Helper Functions ---
function createInitialRecordState<T>(keys: readonly ExplicitQuestionTypeValue[], defaultValue: T): Record<CurrentQuestionTypeValue, T> { 
  const i = {} as Record<CurrentQuestionTypeValue, T>; 
  keys.forEach(k => i[k] = defaultValue); return i; 
}
function createInitialNestedRecordState<T>(keys: readonly ExplicitQuestionTypeValue[]): Record<CurrentQuestionTypeValue, Record<number, T>> { 
  const i = {} as Record<CurrentQuestionTypeValue, Record<number,T>>; 
  keys.forEach(k => i[k] = {}); return i; 
}

const getFinalMcqCorrectIndex = (question: Question): number | undefined => {
    const options = question.options ?? []; let finalCorrectIndex = question.correctAnswerIndex;
    if (typeof finalCorrectIndex !== 'number' || finalCorrectIndex < 0 || finalCorrectIndex >= options.length) {
        if (typeof question.answer === 'string' && /^[A-D]$/i.test(question.answer) && options.length === 4) {
            const letterIndex = question.answer.toUpperCase().charCodeAt(0) - 65;
            if (letterIndex >= 0 && letterIndex < 4) { finalCorrectIndex = letterIndex; } else { finalCorrectIndex = undefined; }
        } else { const derivedIndex = options.findIndex(opt => typeof opt === 'string' && opt.includes('✓')); if (derivedIndex !== -1) { finalCorrectIndex = derivedIndex; } else { finalCorrectIndex = undefined; }}
    } return finalCorrectIndex;
};

// --- Props Interface ---
interface DashboardProps { chapterContent: string; subject: string; grade: string; startPage?: number; endPage?: number; }

const Dashboard: React.FC<DashboardProps> = ({ chapterContent: initialChapterContent, subject, grade, startPage, endPage }) => {
  // === Core State ===
  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [noteGenerationMessage, setNoteGenerationMessage] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [activeQuestionTab, setActiveQuestionTab] = useState<CurrentQuestionTypeValue>('multiple-choice');
  const { toast } = useToast();

  // === Questions State (per tab) ===
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<CurrentQuestionTypeValue, Question[]>>(() => createInitialRecordState(availableQuestionTypes, []));
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<Record<CurrentQuestionTypeValue, boolean>>(() => createInitialRecordState(availableQuestionTypes, false));
  const [questionGenerationMessage, setQuestionGenerationMessage] = useState<Record<CurrentQuestionTypeValue, string | null>>(() => createInitialRecordState(availableQuestionTypes, null));
  const [showAnswer, setShowAnswer] = useState<Record<CurrentQuestionTypeValue, Record<number, boolean>>>(() => createInitialNestedRecordState<boolean>(availableQuestionTypes));

  // === MCQ Interaction State (per tab) ===
  const [selectedAnswers, setSelectedAnswers] = useState<Record<CurrentQuestionTypeValue, Record<number, number | undefined>>>(() => createInitialNestedRecordState<number | undefined>(availableQuestionTypes));
  const [submittedMcqs, setSubmittedMcqs] = useState<Record<CurrentQuestionTypeValue, boolean>>(() => createInitialRecordState(availableQuestionTypes, false));
  const [mcqScores, setMcqScores] = useState<Record<CurrentQuestionTypeValue, { userScore: number, scorableQuestions: number, totalQuestions: number } | null>>(() => createInitialRecordState(availableQuestionTypes, null));

  // === Saving/Loading State ===
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [savedNotesItems, setSavedNotesItems] = useState<Array<{key: string, data: SavedNote}>>([]);
  const [savedQuestionSetItems, setSavedQuestionSetItems] = useState<Array<{key: string, data: SavedQuestionSet}>>([]);
  const [isDeletingItem, setIsDeletingItem] = useState<string | null>(null);

  // === Effect to Reset State on Context Props Change ===
  useEffect(() => {
    setChapterContent(initialChapterContent);
    setGeneratedNotes(''); setIsGeneratingNotes(false); setNoteGenerationMessage(null);
    setGeneratedQuestions(createInitialRecordState(availableQuestionTypes, []));
    setIsGeneratingQuestions(createInitialRecordState(availableQuestionTypes, false)); setQuestionGenerationMessage(createInitialRecordState(availableQuestionTypes, null));
    setShowAnswer(createInitialNestedRecordState<boolean>(availableQuestionTypes));
    setSelectedAnswers(createInitialNestedRecordState<number | undefined>(availableQuestionTypes));
    setSubmittedMcqs(createInitialRecordState(availableQuestionTypes, false)); setMcqScores(createInitialRecordState(availableQuestionTypes, null));
    setComponentError(null); 
    if (!availableQuestionTypes.includes(activeQuestionTab)) { setActiveQuestionTab('multiple-choice'); }
    setIsSavingNotes(false); setIsSavingQuestions(false);
    scanForSavedItems(); 
  }, [initialChapterContent, subject, grade, startPage, endPage, activeQuestionTab]);

  // === Scan for All Saved Items from Local Storage ===
  const scanForSavedItems = useCallback(() => {
    const noteItemsList: Array<{key: string, data: SavedNote}> = [];
    const questionSetItemsList: Array<{key: string, data: SavedQuestionSet}> = [];
    if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                try {
                    if (key.startsWith('studyAid_note_')) {
                        const item = localStorage.getItem(key);
                        if (item) noteItemsList.push({ key, data: JSON.parse(item) as SavedNote });
                    } else if (key.startsWith('studyAid_questionSet_')) {
                        const item = localStorage.getItem(key);
                        if (item) questionSetItemsList.push({ key, data: JSON.parse(item) as SavedQuestionSet });
                    }
                } catch (e) { console.error("Error parsing saved item from localStorage:", key, e); }
            }
        }
    }
    noteItemsList.sort((a,b) => b.data.timestamp - a.data.timestamp);
    questionSetItemsList.sort((a,b) => b.data.timestamp - a.data.timestamp);
    setSavedNotesItems(noteItemsList);
    setSavedQuestionSetItems(questionSetItemsList);
  }, []);

  useEffect(() => { scanForSavedItems(); }, [scanForSavedItems]);


  // === General Helpers ===
  const getCorrectAnswerLetter = (index?: number): string | null => { if (typeof index !== 'number' || index < 0 || index > 3) return null; return String.fromCharCode(65 + index); };
  const toggleShowAnswer = ( questionType: CurrentQuestionTypeValue, index: number ) => { setShowAnswer((prev) => { const current = prev[questionType] ?? {}; return { ...prev, [questionType]: { ...current, [index]: !current[index] } }; }); };
  const validateInputs = (): boolean => { 
    setComponentError(null); let isValid = true; let errorMsg = ''; 
    if (!subject?.trim() || !grade?.trim()) { errorMsg = 'Subject & Grade are required.'; isValid = false; } 
    else if (!chapterContent || chapterContent.trim().length < 20) { errorMsg = 'Chapter content is missing or too short (min 20 characters).'; isValid = false; } 
    if (!isValid) { toast({ title: 'Input Missing', description: errorMsg, variant: 'destructive' }); setComponentError(errorMsg); } 
    return isValid; 
  };

  // === Markdown Renderers ===
  const renderInlineFormatting = (text: string | null | undefined): string => { 
    if (!text) return ''; let html = String(text);
    html = html.replace(/</g, '<').replace(/>/g, '>'); 
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '<em>$1</em>'); html = html.replace(/(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code class="bg-muted text-muted-foreground px-1 py-0.5 rounded font-mono text-sm">$1</code>'); html = html.replace(/__+/g, '<span class="italic text-muted-foreground">[blank]</span>'); return html; 
  };

  const renderQuestionContent = ( questionType: CurrentQuestionTypeValue, questionData: Question, questionIndex: number ): React.ReactNode => {
    const isShowingAnswer = showAnswer[questionType]?.[questionIndex] || false; const isMCQ = questionType === 'multiple-choice';
    const isSetSubmitted = submittedMcqs[questionType]; const selectedOptionForThisQ = selectedAnswers[questionType]?.[questionIndex];
    
    const AnswerReveal = ({ derivedLetter, originalLetter }: { derivedLetter: string | null, originalLetter: string | null }) => {
        const displayLetter = isMCQ ? (derivedLetter ?? originalLetter) : null;
        return ( <div className="mt-3 p-3 md:p-4 bg-muted/70 dark:bg-muted/40 rounded-md border border-border/50 space-y-2 md:space-y-3 text-xs md:text-sm"> {isMCQ ? ( displayLetter ? ( <p className="font-semibold text-green-700 dark:text-green-400"> Correct Answer: {displayLetter} {derivedLetter && !originalLetter && ( <span className="text-xs font-normal text-muted-foreground ml-2">(Derived from ✓)</span> )} </p> ) : ( <p className="font-semibold text-orange-600 dark:text-orange-400"> Correct answer could not be determined. </p> ) ) : questionData.answer?.trim() ? ( <div> <strong className="text-foreground/80 block mb-1">Answer:</strong> <span className="block pl-2" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(questionData.answer), }} /> </div> ) : ( <p className="font-semibold text-red-600 dark:text-red-400"> Answer not provided. </p> )} {questionData.explanation?.trim() ? ( <div className="text-muted-foreground mt-2 pt-2 border-t border-border/30"> <strong className="text-foreground/80 block mb-1">Explanation:</strong> <span className="block pl-2" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(questionData.explanation), }} /> </div> ) : ( (isMCQ || questionType === 'true-false') && (isShowingAnswer || isSetSubmitted) && <p className="text-muted-foreground italic mt-2 pt-2 border-t border-border/30 text-xs"> Explanation not provided{isMCQ && !displayLetter ? ' (and answer is undetermined)' : ''}. </p> )} </div> );
    };
    const RevealButton = () => (
        <Button variant="outline" size="sm" onClick={() => toggleShowAnswer(questionType, questionIndex)} className="mt-3 transition-colors text-xs">
            {isShowingAnswer ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
            {isShowingAnswer ? 'Hide' : 'Show'} Explanation
        </Button>
    );

    if (isMCQ && questionData) {
      const options = questionData.options ?? []; const finalCorrectIndex = getFinalMcqCorrectIndex(questionData);
      const cleanedOptions = options.map(opt => typeof opt === 'string' ? opt.replace(/✓/g, '').trim() : String(opt));
      return (
        <div className="mt-2 md:mt-3 space-y-1.5 md:space-y-2">
          <RadioGroup value={selectedOptionForThisQ?.toString()} onValueChange={(value) => handleMcqOptionSelect(questionIndex, parseInt(value))} className="space-y-2 mt-3" disabled={isSetSubmitted} >
            {cleanedOptions.map((choice, choiceIndex) => {
              const L = getCorrectAnswerLetter(choiceIndex); const uniqueId = `q-${questionType}-${questionIndex}-opt-${choiceIndex}`; let optionStyle = `border-input hover:border-primary/50 ${isSetSubmitted ? 'cursor-default' : 'cursor-pointer'}`; let icon = null;
              if (isSetSubmitted && typeof finalCorrectIndex === 'number') { const isActuallyCorrect = finalCorrectIndex === choiceIndex; if (isActuallyCorrect) { optionStyle = 'bg-green-100 dark:bg-green-900/60 border-green-500 font-medium ring-1 ring-green-500'; icon = <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto shrink-0" />; } else if (selectedOptionForThisQ === choiceIndex && !isActuallyCorrect) { optionStyle = 'bg-red-100 dark:bg-red-900/60 border-red-500 ring-1 ring-red-500'; icon = <XCircle className="h-4 w-4 text-red-600 dark:text-red-500 ml-auto shrink-0" />; } else { optionStyle = 'bg-background/70 border-border opacity-70'; } } else if (selectedOptionForThisQ === choiceIndex && !isSetSubmitted) { optionStyle = 'bg-primary/10 border-primary ring-1 ring-primary'; }
              return ( <Label key={uniqueId} htmlFor={uniqueId} className={`flex items-center p-2 md:p-2.5 rounded-md border text-xs md:text-sm transition-all duration-150 ease-in-out ${optionStyle}`}> <RadioGroupItem value={choiceIndex.toString()} id={uniqueId} className="mr-3 shrink-0" /> <span className="font-semibold mr-1.5 text-primary/80 w-4">{L ?? '?'}:</span> <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(choice) }} /> {icon} </Label> );
            })}
          </RadioGroup>
          {(isSetSubmitted || isShowingAnswer) && <RevealButton />} {(isSetSubmitted || isShowingAnswer) && <AnswerReveal derivedLetter={null} originalLetter={getCorrectAnswerLetter(finalCorrectIndex)} />}
        </div> );
    } else { 
        return ( 
            <div className="mt-2 md:mt-3"> 
                <RevealButton /> 
                {/* CORRECTED: Ensure questionData.answer is passed as string | null */}
                {isShowingAnswer && <AnswerReveal derivedLetter={null} originalLetter={questionData.answer ?? null} />} 
            </div> 
        ); 
    }
  };

  // === Generation Handlers ===
  const handleGenerateNotes = async () => { 
    if (!validateInputs()) return; 
    setGeneratedNotes(''); setIsGeneratingNotes(true); setNoteGenerationMessage("AI generating notes..."); 
    try { 
      const result = await generateNotes({ textbookChapter: chapterContent, gradeLevel: `${grade}th Grade`, subject: subject }); 
      if (result?.notes?.trim()) { setGeneratedNotes(result.notes); toast({ title: "Success!", description: "Notes generated. Save them manually if desired." }); } 
      else { throw new Error("AI returned empty notes."); } 
    } catch (error: any) { const msg = error.message || 'Error generating notes.'; toast({ title: "Notes Error", description: msg, variant: "destructive" }); setComponentError(msg); setGeneratedNotes(''); } 
    finally { setIsGeneratingNotes(false); setNoteGenerationMessage(null); } 
  };

  const handleGenerateQuestions = async (questionType: CurrentQuestionTypeValue) => {
    if (!validateInputs()) return; const typeTitle = questionTypeTitles[questionType];
    setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] })); setShowAnswer(prev => ({ ...prev, [questionType]: {} }));
    if (questionType === 'multiple-choice') { setSelectedAnswers(prev => ({ ...prev, [questionType]: {} })); setSubmittedMcqs(prev => ({ ...prev, [questionType]: false })); setMcqScores(prev => ({ ...prev, [questionType]: null }));}
    setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: true })); setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: `AI generating ${typeTitle}...` })); setComponentError(null);
    try { 
        const numQuestionsToRequest = 10; 
        const inputData: GenerateStudyQuestionsInput = { chapterContent, questionType, numberOfQuestions: numQuestionsToRequest, gradeLevel: `${grade}th Grade`, subject }; 
        const result = await generateStudyQuestions(inputData); 
        if (result?.questions && Array.isArray(result.questions)) { 
            const questionsReceived = result.questions as Question[]; 
            setGeneratedQuestions(prev => ({ ...prev, [questionType]: questionsReceived })); 
            if (questionsReceived.length > 0) toast({ title: "Success!", description: `${questionsReceived.length} ${typeTitle} questions generated. Save manually if desired.` }); 
            else toast({ title: "No Questions", description: `AI returned 0 ${typeTitle} questions.`, variant: "default" }); 
        } else { throw new Error("Invalid question structure from AI."); } 
    } catch (error: any) { const msg = error.message || `Error generating ${typeTitle}.`; toast({ title: "Question Error", description: msg, variant: "destructive" }); setComponentError(msg); setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] })); } 
    finally { setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: false })); setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: null })); }
  };

  // === MCQ Handlers ===
  const handleMcqOptionSelect = useCallback((questionIndex: number, optionIndex: number) => {
    if (submittedMcqs[activeQuestionTab]) return;
    setSelectedAnswers(prev => ({ ...prev, [activeQuestionTab]: { ...(prev[activeQuestionTab] || {}), [questionIndex]: optionIndex } }));
  }, [activeQuestionTab, submittedMcqs]);

  const handleSubmitMcq = () => {
    if (activeQuestionTab !== 'multiple-choice') return; 
    const currentQuestions = generatedQuestions[activeQuestionTab]; const currentSelected = selectedAnswers[activeQuestionTab];
    if (!currentQuestions || currentQuestions.length === 0) { toast({ title: "No Questions", description: "No MCQs to submit.", variant: "default" }); return; }
    let userCorrectAnswers = 0; let scorableQuestionsCount = 0;
    currentQuestions.forEach((q, index) => { const finalCorrectIdx = getFinalMcqCorrectIndex(q); if (typeof finalCorrectIdx === 'number') { scorableQuestionsCount++; const userAnswerIndex = currentSelected?.[index]; if (userAnswerIndex === finalCorrectIdx) { userCorrectAnswers++; } }});
    const scoreData = { userScore: userCorrectAnswers, scorableQuestions: scorableQuestionsCount, totalQuestions: currentQuestions.length }; 
    setMcqScores(prev => ({ ...prev, [activeQuestionTab]: scoreData })); setSubmittedMcqs(prev => ({ ...prev, [activeQuestionTab]: true }));
    toast({ title: "MCQ Set Submitted!", description: scorableQuestionsCount > 0 ? `You scored ${userCorrectAnswers}/${scorableQuestionsCount}.` : "Answers submitted.", });
    const newShowAnswersForTab = { ...(showAnswer[activeQuestionTab] || {}) }; currentQuestions.forEach((_, index) => newShowAnswersForTab[index] = true); setShowAnswer(prev => ({...prev, [activeQuestionTab]: newShowAnswersForTab }));
  };

  // === Save & Load Handlers ===
  const handleSaveNotesToLocalStorage = () => { 
    if (!validateInputs()) return;
    if (!generatedNotes.trim()) { toast({ title: "No Notes", description: "Nothing to save.", variant: "default" }); return; } 
    setIsSavingNotes(true); 
    try { 
        const noteData: SavedNote = { notes: generatedNotes, timestamp: Date.now(), subject, grade, startPage, endPage, chapterContentSnippet: chapterContent.substring(0,100) };
        const noteKey = `studyAid_note_${noteData.timestamp}`; 
        localStorage.setItem(noteKey, JSON.stringify(noteData)); 
        toast({ title: "Notes Saved Locally!", description: `New note entry created.` }); 
        scanForSavedItems(); 
    } catch (error:any) { console.error("Error saving notes:", error); toast({ title: "Save Error", description: error.message || "Could not save notes locally.", variant: "destructive" }); } 
    finally { setIsSavingNotes(false); } 
  };

  const handleSaveQuestionSet = (questionTypeToSave: CurrentQuestionTypeValue) => {
    if (!validateInputs()) return;
    const questionsToSave = generatedQuestions[questionTypeToSave];
    if (!questionsToSave || questionsToSave.length === 0) { toast({ title: "No Questions", description: "Nothing to save.", variant: "default" }); return; }
    setIsSavingQuestions(true);
    try {
        const questionSetData: SavedQuestionSet = {
            questionType: questionTypeToSave, questions: questionsToSave, timestamp: Date.now(),
            subject, grade, startPage, endPage, chapterContentSnippet: chapterContent.substring(0,100),
            ...(questionTypeToSave === 'multiple-choice' && { selectedAnswers: selectedAnswers[questionTypeToSave], isSubmitted: submittedMcqs[questionTypeToSave], score: mcqScores[questionTypeToSave] })
        };
        const questionSetKey = `studyAid_questionSet_${questionTypeToSave}_${questionSetData.timestamp}`;
        localStorage.setItem(questionSetKey, JSON.stringify(questionSetData));
        toast({ title: "Question Set Saved!", description: `Saved ${questionTypeTitles[questionTypeToSave]} locally.` });
        scanForSavedItems();
    } catch (error: any) { console.error("Error saving Qs:", error); toast({ title: "Save Error", description: error.message || "Could not save Qs.", variant: "destructive" }); } 
    finally { setIsSavingQuestions(false); }
  };

  const handleLoadSavedNote = (key: string) => { 
    setIsDeletingItem(null); 
    const itemToLoad = savedNotesItems.find(item => item.key === key);
    if (itemToLoad?.data) { 
        setGeneratedNotes(itemToLoad.data.notes); 
        toast({ title: "Note Loaded", description: `Loaded notes for ${itemToLoad.data.subject} G${itemToLoad.data.grade}`}); 
    } else { toast({ title: "Error", description: "Note data not found.", variant: "destructive" }); }
  };
  
  const handleLoadSavedQuestionSet = (key: string) => {
    setIsDeletingItem(null); 
    const itemToLoad = savedQuestionSetItems.find(item => item.key === key);
    if (itemToLoad?.data) {
        const { questionType, questions, selectedAnswers: sa, isSubmitted: isSub, score: sc, subject:s, grade:g } = itemToLoad.data;
        setGeneratedQuestions(prev => ({ ...prev, [questionType]: questions || [] }));
        if (questionType === 'multiple-choice') {
            setSelectedAnswers(prev => ({ ...prev, [questionType]: sa || {} }));
            setSubmittedMcqs(prev => ({ ...prev, [questionType]: isSub || false }));
            setMcqScores(prev => ({ ...prev, [questionType]: sc || null }));
        } else { setSelectedAnswers(prev => ({ ...prev, [questionType]: {} })); setSubmittedMcqs(prev => ({ ...prev, [questionType]: false })); setMcqScores(prev => ({ ...prev, [questionType]: null })); }
        setActiveQuestionTab(questionType);
        toast({ title: "Question Set Loaded", description: `Loaded ${questionTypeTitles[questionType]} for ${s} G${g}.` });
    } else { toast({ title: "Error", description: "Could not find saved Qs data.", variant: "destructive" }); }
  };

  const handleDeleteSavedItem = (key: string) => { 
    if (!key) return; setIsDeletingItem(key); 
    try { localStorage.removeItem(key); toast({ title: "Item Deleted" }); scanForSavedItems(); } 
    catch (error: any) { toast({ title: "Delete Error", description:error.message || "Could not delete.", variant: "destructive" }); } 
    finally { setIsDeletingItem(null); } 
  };

  // --- PDF Download Functions ---
  const handleDownloadNotesPdf = async () => {
    if (!generatedNotes.trim()) { toast({ title: "Cannot Download", description: "No notes generated.", variant: "destructive" }); return; }
    const { id: generatingToastId, dismiss: dismissGeneratingToast } = toast({ title: "Generating Visual PDF...", description: "Please wait...", duration: Infinity, });
    try {
      let logoDataUrl: string | null = null; try { logoDataUrl = await loadImageData('/logo.png'); } catch (e: any) { console.warn("Logo load error:", e.message); }
      const captureContainer = document.createElement('div'); captureContainer.id = 'pdf-visual-capture-area'; Object.assign(captureContainer.style, { position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', padding: '20px', background: 'white' });
      if (document.documentElement.classList.contains('dark')) { captureContainer.classList.add('dark'); } document.body.appendChild(captureContainer);
      const reactRoot = ReactDOM.createRoot(captureContainer);
      reactRoot.render( <React.StrictMode> <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"> <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownPdfComponents}>{generatedNotes}</ReactMarkdown> </div> </React.StrictMode> );
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mainCanvas = await html2canvas(captureContainer, { scale: 2, useCORS: true, logging: false, removeContainer: false, onclone: (doc) => { const isDark = document.documentElement.classList.contains('dark'); doc.documentElement.classList.toggle('dark', isDark); doc.body.classList.toggle('dark', isDark);}});
      reactRoot.unmount(); document.body.removeChild(captureContainer);
      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' }); const pdfW = doc.internal.pageSize.getWidth(); const pdfH = doc.internal.pageSize.getHeight(); const margin = 40; const footerH_pdf = 40; const contentW = pdfW - margin * 2; const imgOrigW = mainCanvas.width; const imgOrigH = mainCanvas.height; const pdfImgRenderW = contentW; const scale = pdfImgRenderW / imgOrigW; let yOffset = 0; let pageNum = 0;
      const addHeader = (): number => { let hY = margin; if (logoDataUrl) { const logoS=30; doc.addImage(logoDataUrl,'PNG',pdfW-margin-logoS,margin-15,logoS,logoS); hY=Math.max(hY,margin-15+logoS+10); } doc.setFont('helvetica','bold').setFontSize(14); const title=`Study Notes: ${subject||'Notes'} - G${grade||'N/A'}`; const titleLines = doc.splitTextToSize(title,pdfW-margin*2-(logoDataUrl?45:0)); doc.text(titleLines,margin,hY); hY+=doc.getTextDimensions(titleLines.join('\n')).h+10; doc.setLineWidth(.5).line(margin,hY,pdfW-margin,hY); return hY+15; };
      const addFooter = (pg: number, total: number) => { const fSY=pdfH-margin-footerH_pdf+10; doc.setLineWidth(.2).line(margin,fSY,pdfW-margin,fSY); let cFY=fSY+15; doc.setFontSize(8).setFont('helvetica','italic'); if(startPage !== undefined && endPage !== undefined && startPage > 0 && endPage > 0){ doc.text(`Source Pages: ${startPage} - ${endPage}`,margin,cFY); cFY+=10; } doc.setTextColor(60,60,60).text("Telegram: @grade9to12ethiopia",margin,cFY); doc.setTextColor(0,0,0); const pTxt=`Page ${pg} of ${total}`; doc.text(pTxt,pdfW-margin-doc.getTextWidth(pTxt),cFY);};
      while (yOffset < imgOrigH) { pageNum++; if (pageNum > 1) doc.addPage(); doc.setPage(pageNum); const contentSY = addHeader(); const availH = pdfH - contentSY - margin - footerH_pdf; if (availH <= 0) { if (pageNum > 50) {console.error("PDF gen error (notes): available height too small."); break;} continue; } let segH = availH / scale; segH = Math.min(segH, imgOrigH - yOffset); if (segH <= 0) break; const segCan = document.createElement('canvas'); segCan.width = imgOrigW; segCan.height = segH; const segCtx = segCan.getContext('2d'); if (segCtx) { segCtx.drawImage(mainCanvas, 0, yOffset, imgOrigW, segH, 0, 0, imgOrigW, segH ); doc.addImage(segCan.toDataURL('image/png'), 'PNG', margin, contentSY, pdfImgRenderW, segH * scale ); } yOffset += segH; }
      const totalPgs = doc.getNumberOfPages(); for (let i = 1; i <= totalPgs; i++) { doc.setPage(i); addFooter(i, totalPgs); }
      const fNameSub = (subject||'Notes').replace(/ /g,'_'); const fNameGrade = grade||'N_A'; const fNamePages = (startPage !== undefined && endPage !== undefined) ? `_p${startPage}-${endPage}` : ''; const fName = `${fNameSub}_G${fNameGrade}${fNamePages}_Notes_Visual.pdf`; doc.save(fName);
      dismissGeneratingToast(); toast({ title: "Visual PDF Generated!", description: `${fName} downloading.`, duration: 7000 });
    } catch (error: any) { console.error("Visual PDF Error:", error); dismissGeneratingToast(); toast({ title: "PDF Error", description: error.message || "Could not generate visual PDF.", variant: "destructive" }); }
  };

  const handleDownloadQuestionsPdf = async () => {
      const questionsToDownload = generatedQuestions[activeQuestionTab]; const currentQuestionTypeTitle = questionTypeTitles[activeQuestionTab]; 
      if (!questionsToDownload || questionsToDownload.length === 0) { toast({ title: "Cannot Download", description: `No ${currentQuestionTypeTitle} questions.`, variant: "destructive"}); return; }
      const { id: genQToastId, dismiss: dismissGenQToast } = toast({ title: `Generating ${currentQuestionTypeTitle} PDF...`, description:"Please wait.", duration: Infinity });
      try {
          let logoDataUrl: string | null = null; try { logoDataUrl = await loadImageData('/logo.png'); } catch (e:any) { console.warn("Logo PDF fail:", e.message); }
          const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' }); 
          const pageH = doc.internal.pageSize.height; const pageW = doc.internal.pageSize.width; const margin = 40; const lineMaxW = pageW - margin * 2; let yPos = margin; const footerReserve = 60;
          let currentPageNum = 1;

          const addPageWithHeader = (): number => { if (currentPageNum > 1) { doc.addPage(); } doc.setPage(currentPageNum); let currentY = margin; if (logoDataUrl) { const logoS=30; doc.addImage(logoDataUrl, 'PNG', pageW - margin - logoS, margin - 15, logoS, logoS); currentY = Math.max(currentY, margin - 15 + logoS + 10); } doc.setFont("helvetica", "bold").setFontSize(14); const title = `Practice Questions: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`; const titleLines = doc.splitTextToSize(title, lineMaxW - (logoDataUrl ? 45 : 0)); doc.text(titleLines, margin, currentY); currentY += doc.getTextDimensions(titleLines.join('\n')).h + 5; doc.setFont("helvetica", "italic").setFontSize(12); const typeTxt = `Type: ${currentQuestionTypeTitle}`; doc.text(typeTxt, margin, currentY); currentY += doc.getTextDimensions(typeTxt).h + 10; doc.setLineWidth(0.5).line(margin, currentY, pageW - margin, currentY); return currentY + 15; };
          const addFooterToPage = (pageNum: number, totalPages: number) => { doc.setPage(pageNum); const footSY = pageH - margin - footerReserve + 10; doc.setLineWidth(0.2).line(margin, footSY, pageW - margin, footSY); let currentFooterY = footSY + 15; doc.setFontSize(8).setFont('helvetica', 'italic'); if (startPage !== undefined && endPage !== undefined) { doc.text(`Source Pages: ${startPage} - ${endPage}`, margin, currentFooterY); currentFooterY += 10; } doc.setTextColor(60,60,60).text("Telegram: @grade9to12ethiopia", margin, currentFooterY); doc.setTextColor(0,0,0); const pageNumText = `Page ${pageNum} of ${totalPages}`; doc.text(pageNumText, pageW - margin - doc.getTextWidth(pageNumText), currentFooterY);};
          const addTextWithPotentialPageBreak = (text: string | null | undefined, x: number, currentY: number, options?: any): number => {
              if (!text || !text.trim()) return currentY; const fontSize = options?.fontSize || 10; const fontStyle = options?.fontStyle || 'normal'; const textMaxWidth = options?.maxWidth || lineMaxW; doc.setFontSize(fontSize).setFont('helvetica', fontStyle); const lines = doc.splitTextToSize(text, textMaxWidth); const lineHeight = doc.getLineHeightFactor() * fontSize * (options?.lineHeightFactor || 1.0); let newY = currentY;
              for (const line of lines) { if (newY + lineHeight > pageH - margin - footerReserve) { addFooterToPage(currentPageNum, 0); currentPageNum++; newY = addPageWithHeader(); doc.setFontSize(fontSize).setFont('helvetica', fontStyle); } doc.text(line, x, newY); newY += lineHeight; } return newY + (fontSize * 0.15);
          };
          yPos = addPageWithHeader();
          questionsToDownload.forEach((q, index) => {
              const questionText = `${index + 1}. ${q.question || 'Missing Question Text'}`; yPos = addTextWithPotentialPageBreak(questionText, margin, yPos, { fontStyle: 'bold', fontSize: 11, lineHeightFactor: 0.9 }); yPos += 2;
              if (activeQuestionTab === 'multiple-choice' && q.options && q.options.length > 0) { if (q.options.length !== 4 && q.options.length !== 0) { console.warn(`PDF Gen: MCQ Q${index+1} option count is ${q.options.length}`); } q.options.forEach((opt, optIndex) => { const optionText = `${getCorrectAnswerLetter(optIndex) || '?'}) ${(typeof opt === 'string' ? opt.replace(/✓/g, '').trim() : '[Invalid Option]') || 'Missing Option Text'}`; yPos = addTextWithPotentialPageBreak(optionText, margin + 15, yPos, { maxWidth: lineMaxW - 15, fontSize: 10, lineHeightFactor: 0.9 }); }); yPos += 2; } 
              else if (activeQuestionTab === 'multiple-choice') { yPos = addTextWithPotentialPageBreak(`[No options provided or options invalid]`, margin + 15, yPos, {fontStyle: 'italic', fontSize: 9}); }
              let answerText = 'Answer: Not provided'; if (activeQuestionTab !== 'multiple-choice' && q.answer) { answerText = `Answer: ${q.answer}`; } else if (activeQuestionTab === 'multiple-choice') { const correctIdx = getFinalMcqCorrectIndex(q); answerText = `Correct Answer: ${typeof correctIdx === 'number' ? getCorrectAnswerLetter(correctIdx) : 'Could not determine'}`; }
              yPos = addTextWithPotentialPageBreak(answerText, margin + 15, yPos, { maxWidth: lineMaxW - 15, fontStyle: 'italic', fontSize: 9 }); yPos += 2;
              if (q.explanation) { yPos = addTextWithPotentialPageBreak(`Explanation: ${q.explanation}`, margin + 15, yPos, { maxWidth: lineMaxW - 15, fontStyle: 'italic', fontSize: 9}); yPos += 2; }
              yPos += 8;
              if (index < questionsToDownload.length - 1) { if (yPos + 15 > pageH - margin - footerReserve) { addFooterToPage(currentPageNum, 0); currentPageNum++; yPos = addPageWithHeader(); } else { doc.setLineWidth(0.2).line(margin, yPos, pageW - margin, yPos); yPos += 10; }}
          });
          const finalTotalPages = currentPageNum; for (let i = 1; i <= finalTotalPages; i++) { addFooterToPage(i, finalTotalPages); }
          dismissGenQToast(); const fileSub = (subject || 'Questions').replace(/ /g,'_'); const fileGrade = grade || 'N_A'; const filePages = (startPage !== undefined && endPage !== undefined) ? `_p${startPage}-${endPage}` : ''; const filename = `${fileSub}_G${fileGrade}${filePages}_${activeQuestionTab}_Qs.pdf`;
          doc.save(filename); toast({ title: "Download Started", description: `Downloading ${filename}`});
      } catch(error: any) { dismissGenQToast(); console.error("Error Qs PDF:", error); toast({ title: "PDF Error", description: `Qs PDF: ${error.message || 'Unknown'}.`, variant: "destructive"}); }
  };
  
  const markdownDisplayComponents: Components = {
    table: ({node, ...props}) => <div className="overflow-x-auto w-full my-4 border border-border rounded-md shadow-sm"><table {...props} className="min-w-full divide-y divide-border text-sm"/></div>,
    thead: ({node, ...props}) => <thead {...props} className="bg-muted/50"/>,
    th: ({node, children, ...props }) => <th {...props} className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{React.Children.map(children, child => String(child))}</th>,
    td: ({node, children, ...props }) => <td {...props} className="px-3 py-2 text-muted-foreground">{React.Children.map(children, child => String(child))}</td>,
    pre: ({node, children, ...props}) => (
      <div className="overflow-x-auto w-full bg-muted p-3 my-2 rounded-md text-sm">
        {/* Ensure children of pre (which should be a code element) are handled */}
        <pre {...props}>{children}</pre> 
      </div>
    ),
    img: ({node, ...props}) => <img {...props} crossOrigin="anonymous" style={{maxWidth: '100%', height: 'auto', borderRadius: '0.25rem', margin:'0.5rem 0'}} />,
    p: ({node, children, ...props}) => <p {...props} className="mb-2 leading-relaxed text-sm">{children}</p>,
    ul: ({node, children, ...props}) => <ul {...props} className="list-disc pl-5 mb-2 space-y-0.5 text-sm">{children}</ul>,
    ol: ({node, children, ...props}) => <ol {...props} className="list-decimal pl-5 mb-2 space-y-0.5 text-sm">{children}</ol>,
    li: ({node, children, ...props}) => <li {...props} className="leading-snug">{children}</li>,
    blockquote: ({node, children, ...props}) => <blockquote {...props} className="pl-3 italic border-l-4 border-border text-muted-foreground my-2 text-sm">{children}</blockquote>,
    hr: ({node, ...props}) => <hr {...props} className="my-4 border-border"/>,
    h1: ({node, children, ...props}) => <h1 {...props} className="text-2xl font-bold mt-4 mb-2 pb-1 border-b border-border">{children}</h1>,
    h2: ({node, children, ...props}) => <h2 {...props} className="text-xl font-semibold mt-3 mb-1.5 pb-1 border-b border-border">{children}</h2>,
    h3: ({node, children, ...props}) => <h3 {...props} className="text-lg font-medium mt-2 mb-1">{children}</h3>,
    strong: ({node, children, ...props}) => <strong {...props}>{React.Children.map(children, child => String(child))}</strong>,
    em: ({node, children, ...props}) => <em {...props}>{React.Children.map(children, child => String(child))}</em>,
    code: ({ node, children, className, ...props }) => { // REMOVED 'inline' from props
        const childString = React.Children.toArray(children).map(String).join('');
        const match = /language-(\w+)/.exec(className || '');
        
        // If 'match' is true, it's likely a fenced code block.
        // react-markdown by default wraps fenced code blocks in <pre><code>...</code></pre>.
        // Our custom 'pre' component above will handle the styling for the <pre> block.
        // This 'code' component will then render the inner <code>.
        if (match) { 
            return (
                <code className={className} {...props}>
                    {childString.replace(/\n$/, '')}
                </code>
            );
        }
        // Otherwise, it's inline code
        return (
            <code 
                className={`bg-muted/70 text-muted-foreground px-1 py-0.5 rounded font-mono text-xs ${className || ''}`} 
                {...props}
            >
                {childString}
            </code>
        );
    }
  };
  const markdownPdfComponents: Components = { 
    img: ({node, ...props}) => <img {...props} crossOrigin="anonymous" style={{maxWidth: '100%', height: 'auto'}} />,
    table: ({node, children, ...props}) => <table {...props} style={{width: '100%', borderCollapse: 'collapse', fontSize:'9pt', margin:'8px 0'}}>{children}</table>,
    th: ({node, children, ...props}) => <th {...props} style={{border:'1px solid #ddd', padding:'3px', textAlign:'left', fontWeight:'bold', backgroundColor:'#f9f9f9'}}>{React.Children.map(children, child => String(child))}</th>,
    td: ({node, children, ...props}) => <td {...props} style={{border:'1px solid #ddd', padding:'3px', textAlign:'left'}}>{React.Children.map(children, child => String(child))}</td>,
  };

  // === Main Component Render ===
  return (
    <>
      {componentError && ( <div className="mb-4 md:mb-6 p-4 border border-destructive bg-destructive/10 rounded-lg text-destructive flex items-start text-sm shadow-md"> <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5"/> <div><p className="font-semibold mb-1">Generation Error</p><p>{componentError}</p></div> </div> )}
      <Card className="mb-8 md:mb-10 shadow-lg dark:shadow-slate-800/50 border border-border/50">
        <CardHeader className="p-5 md:p-6">
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
             <div className="flex items-center gap-2.5"> <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" /><CardTitle className="text-lg sm:text-xl md:text-2xl">Generate Study Aids</CardTitle></div>
             <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="text-xs"><History className="h-3.5 w-3.5 mr-1.5"/>Load Note {savedNotesItems.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-[0.65rem] px-1.5 py-0.5 rounded-full">{savedNotesItems.length}</span>}</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 md:w-96 max-h-80 overflow-y-auto">
                        <DropdownMenuLabel>Saved Notes</DropdownMenuLabel><DropdownMenuSeparator />
                        {savedNotesItems.length > 0 ? ( <DropdownMenuGroup> {savedNotesItems.map(({key, data}) => { const pageDisplay = (data.startPage && data.endPage) ? `(P ${data.startPage}-${data.endPage})` : ''; const dateDisplay = new Date(data.timestamp).toLocaleDateString(); const displayKey = `${data.subject} G${data.grade} ${pageDisplay} - ${dateDisplay}`.trim();
                            return ( <DropdownMenuItem key={key} onSelect={(e)=>{e.preventDefault();handleLoadSavedNote(key);}} className="flex justify-between items-center cursor-pointer text-xs"><span className="truncate pr-2" title={displayKey}>{displayKey}</span> <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e)=>{e.stopPropagation();handleDeleteSavedItem(key);}} disabled={isDeletingItem===key} title={`Delete: ${displayKey}`}>{isDeletingItem===key?<Loader2 className="h-3 w-3 animate-spin"/>:<Trash2 className="h-3 w-3"/>}</Button></DropdownMenuItem>);
                        })} </DropdownMenuGroup> ) : ( <DropdownMenuItem disabled className="text-xs">No notes saved.</DropdownMenuItem> )}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="text-xs"><FileQuestion className="h-3.5 w-3.5 mr-1.5"/>Load Qs {savedQuestionSetItems.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-[0.65rem] px-1.5 py-0.5 rounded-full">{savedQuestionSetItems.length}</span>}</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 md:w-96 max-h-80 overflow-y-auto">
                        <DropdownMenuLabel>Saved Question Sets</DropdownMenuLabel><DropdownMenuSeparator />
                        {savedQuestionSetItems.length > 0 ? ( <DropdownMenuGroup> {savedQuestionSetItems.map(({key, data}) => { const pageDisplay = (data.startPage && data.endPage) ? `(P ${data.startPage}-${data.endPage})` : ''; const dateDisplay = new Date(data.timestamp).toLocaleDateString(); const typeDisplay = questionTypeTitles[data.questionType]?.replace('Multiple Choice','MCQ') || data.questionType; const displayKey = `${data.subject} G${data.grade} ${pageDisplay} - ${typeDisplay} - ${dateDisplay}`.trim();
                            return ( <DropdownMenuItem key={key} onSelect={(e)=>{e.preventDefault();handleLoadSavedQuestionSet(key);}} className="flex justify-between items-center cursor-pointer text-xs"><span className="truncate pr-2" title={displayKey}>{displayKey}</span> <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e)=>{e.stopPropagation();handleDeleteSavedItem(key);}} disabled={isDeletingItem===key} title={`Delete: ${displayKey}`}>{isDeletingItem===key?<Loader2 className="h-3 w-3 animate-spin"/>:<Trash2 className="h-3 w-3"/>}</Button></DropdownMenuItem>);
                        })} </DropdownMenuGroup> ) : ( <DropdownMenuItem disabled className="text-xs">No question sets saved.</DropdownMenuItem> )}
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
           </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 p-5 md:p-6">
          <Button onClick={handleGenerateNotes} disabled={isGeneratingNotes || !!componentError || Object.values(isGeneratingQuestions).some(loading => loading)} size="lg" aria-busy={isGeneratingNotes} className="sm:col-span-1 md:col-span-1" > {isGeneratingNotes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} <span className="hidden sm:inline">Generate </span>Notes </Button>
          {availableQuestionTypes.map((type) => { const title = questionTypeTitles[type]; const isLoading = isGeneratingQuestions[type]; const message = questionGenerationMessage[type]; const Icon = type === 'multiple-choice' ? ListChecks : HelpCircle; return ( <Button key={type} onClick={() => handleGenerateQuestions(type)} disabled={isLoading || !!componentError || isGeneratingNotes} size="lg" aria-busy={isLoading} variant="secondary" className="sm:col-span-1 md:col-span-1" > {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />} {message ? <span className="hidden sm:inline">Generating...</span> : <><span className="hidden sm:inline">Generate </span>{title.replace('Multiple Choice', 'MCQ').replace('Fill-in-the-Blank','FIB').replace('True/False','T/F').replace('Short Answer','Short')}</>} </Button> ); })}
        </CardContent>
      </Card>
      <Separator className="my-8 md:my-10" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2"> <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary/80"/> Generated Notes </CardTitle>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveNotesToLocalStorage} disabled={!generatedNotes.trim() || isGeneratingNotes || isSavingNotes || Object.values(isGeneratingQuestions).some(loading => loading)} title="Save Current Notes Locally"> {isSavingNotes ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5 animate-spin" /> : <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />} <span className="hidden sm:inline">Save</span><span className="sm:hidden">Save</span> </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadNotesPdf} disabled={!generatedNotes.trim() || isGeneratingNotes || isSavingNotes} title="Download Notes as PDF" > <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" /> <span className="hidden sm:inline">Download </span>PDF </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col p-0">
            {isGeneratingNotes && !generatedNotes ? ( <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6 text-center"> <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" /> <p className="text-xs md:text-sm font-medium">{noteGenerationMessage || "Generating notes..."}</p> </div> )
             : !generatedNotes.trim() ? ( <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-6 text-center"> <FileText size={48} className="mb-4 opacity-50" /> <p className="text-sm font-medium">No Notes Generated</p> <p className="text-xs mt-1">Click "Generate Notes" to create some.</p> </div> )
             : ( <ScrollArea className="flex-grow w-full rounded-b-lg border-t dark:border-slate-700"> <div className="p-5 md:p-8"> <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"> 
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownDisplayComponents}>
                  {generatedNotes}
                </ReactMarkdown>
              </div> </div> <ScrollBar orientation="horizontal" /> </ScrollArea> )}
          </CardContent>
        </Card>
        <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                 <CardTitle className="text-base md:text-lg flex items-center gap-2"> <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-primary/80" /> Practice Questions </CardTitle>
                 <div className="flex items-center gap-2">
                    {activeQuestionTab === 'multiple-choice' && generatedQuestions[activeQuestionTab]?.length > 0 && (
                        <> {!submittedMcqs[activeQuestionTab] ? ( <Button variant="default" size="sm" onClick={handleSubmitMcq} disabled={ Object.values(selectedAnswers[activeQuestionTab] || {}).filter(v => v !== undefined).length !== (generatedQuestions[activeQuestionTab]?.length || 0) || isGeneratingQuestions[activeQuestionTab] || isGeneratingNotes }> <Send className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" /> Submit All MCQs </Button> ) : ( mcqScores[activeQuestionTab] && ( <div className="text-xs md:text-sm font-semibold p-1.5 px-2.5 rounded-md bg-muted border"> Score: {mcqScores[activeQuestionTab]?.userScore} / {mcqScores[activeQuestionTab]?.scorableQuestions} <span className="text-muted-foreground text-xs ml-1">({mcqScores[activeQuestionTab]?.totalQuestions} Qs)</span></div> ) )} </>
                    )}
                    {generatedQuestions[activeQuestionTab]?.length > 0 && <Button variant="outline" size="sm" onClick={() => handleSaveQuestionSet(activeQuestionTab)} disabled={isGeneratingQuestions[activeQuestionTab] || isSavingQuestions || isGeneratingNotes} title="Save Current Question Set Locally"> {isSavingQuestions ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5 animate-spin"/> : <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5"/>} <span className="hidden sm:inline">Save Qs</span> </Button> }
                    <Button variant="outline" size="sm" onClick={handleDownloadQuestionsPdf} disabled={(!generatedQuestions[activeQuestionTab] || generatedQuestions[activeQuestionTab].length === 0) || Object.values(isGeneratingQuestions).some(loading => loading) || isGeneratingNotes} title={`Download ${questionTypeTitles[activeQuestionTab]} Questions as PDF`} > <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" /> <span className="hidden sm:inline">Download </span>PDF </Button>
                 </div>
             </CardHeader>
             <CardContent className="flex-grow flex flex-col pt-2 px-4 pb-4 md:px-6 md:pb-6">
                 <Tabs defaultValue="multiple-choice" value={activeQuestionTab} onValueChange={(value) => setActiveQuestionTab(value as CurrentQuestionTypeValue)} className="w-full flex flex-col flex-grow" >
                     <ScrollArea className="w-full whitespace-nowrap rounded-md mb-5 md:mb-6">
                         <TabsList className="inline-grid w-max grid-cols-4">
                             {availableQuestionTypes.map((type) => ( <TabsTrigger key={type} value={type} disabled={!!componentError || isGeneratingNotes || isGeneratingQuestions[type] || Object.values(isGeneratingQuestions).some(loading => loading && type !== activeQuestionTab && loading)} className="text-xs px-2 sm:px-3" > {questionTypeTitles[type].replace('Multiple Choice', 'MCQ').replace('Fill-in-the-Blank','FIB').replace('Short Answer', 'Short').replace('True/False','T/F')} </TabsTrigger> ))}
                         </TabsList>
                         <ScrollBar orientation="horizontal" />
                     </ScrollArea>
                     <div className="flex-grow relative min-h-[400px] md:min-h-[450px] border rounded-md bg-muted/20 dark:bg-muted/30 overflow-hidden">
                         {availableQuestionTypes.map((type) => { const isLoading = isGeneratingQuestions[type]; const message = questionGenerationMessage[type]; const questions = generatedQuestions[type] ?? []; return ( <TabsContent key={type} value={type} className="absolute inset-0 focus-visible:ring-0 focus-visible:ring-offset-0 m-0" tabIndex={-1}> {isLoading && questions.length === 0 ? ( <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center"> <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" /> <p className="text-xs md:text-sm font-medium">{message || `Generating ${questionTypeTitles[type]}...`}</p> </div> ) : questions.length > 0 ? ( <ScrollArea className="h-full w-full"> <ul className="space-y-5 md:space-y-6 p-5 md:p-8">{questions.map((questionItem, qIndex) => ( <li key={`${type}-${qIndex}`} className="border rounded-lg p-4 md:p-5 shadow-sm bg-background dark:border-slate-700"> <p className="font-medium mb-2 md:mb-3 text-sm md:text-base flex items-start"> <span className="text-primary/90 mr-2 font-semibold">{qIndex + 1}.</span> <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(questionItem.question) }}/> </p> {renderQuestionContent(type, questionItem, qIndex)} </li> ))}</ul> </ScrollArea> ) : ( <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center"> <ListChecks className="h-10 w-10 md:h-12 md:w-12 mb-4 opacity-50"/> <p className="text-xs md:text-sm font-medium">No Questions Yet</p> <p className="text-xs mt-1">Click "Generate {questionTypeTitles[type]}" to create some!</p> </div> )} </TabsContent> ); })}
                         </div>
                     </Tabs>
                </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Dashboard;
