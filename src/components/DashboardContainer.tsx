// src/components/DashboardContainer.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// UI Imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Components as ReactMarkdownComponents } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, FileText, Sparkles, AlertCircle } from 'lucide-react';

// Child Component Imports
import { GenerationControlsCard } from './dashboard/GenerationControlsCard';
import { NotesCard } from './dashboard/NotesCard';
import { QuestionsHubCard } from './dashboard/QuestionsHubCard';

// AI Flow Imports
import {
  generateStudyQuestions,
  GenerateStudyQuestionsInput,
} from '@/ai/flows/generate-study-questions';
import { generateNotes } from '@/ai/flows/generate-notes';

// Type Imports
import {
    ExplicitQuestionTypeValue, Question, SavedNote, SavedQuestionSet,
    availableQuestionTypes, questionTypeTitles, CurrentQuestionTypeValue
} from '@/types/dashboard';

// Util Imports
import {
    cn, renderInlineFormatting, getCorrectAnswerLetter, getFinalMcqCorrectIndex,
    createInitialRecordState, createInitialNestedRecordState
} from '@/lib/utils';
import { loadImageData } from '@/lib/imageUtils';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';


// --- Props Interface for DashboardContainer ---
interface DashboardContainerProps {
  chapterContent: string;
  subject: string;
  grade: string;
  startPage?: number;
  endPage?: number;
  currentUserId?: number | string; // Renamed from userId to currentUserId
}


const DashboardContainer: React.FC<DashboardContainerProps> = ({
  chapterContent: initialChapterContent,
  subject,
  grade,
  startPage,
  endPage,
  currentUserId, // Destructure currentUserId
}) => {
  // === Core State ===
  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [noteGenerationMessage, setNoteGenerationMessage] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [activeQuestionTab, setActiveQuestionTab] = useState<CurrentQuestionTypeValue>('multiple-choice');
  const { toast } = useToast();

  // Log received currentUserId
  useEffect(() => {
    console.log("DashboardContainer received currentUserId:", currentUserId);
  }, [currentUserId]);


  // === Questions State ===
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<CurrentQuestionTypeValue, Question[]>>(() => createInitialRecordState(availableQuestionTypes, []));
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<Record<CurrentQuestionTypeValue, boolean>>(() => createInitialRecordState(availableQuestionTypes, false));
  const [questionGenerationMessage, setQuestionGenerationMessage] = useState<Record<CurrentQuestionTypeValue, string | null>>(() => createInitialRecordState(availableQuestionTypes, null));
  const [showAnswer, setShowAnswer] = useState<Record<CurrentQuestionTypeValue, Record<number, boolean>>>(() => createInitialNestedRecordState<boolean>(availableQuestionTypes));

  // === MCQ Interaction State ===
  const [selectedAnswers, setSelectedAnswers] = useState<Record<CurrentQuestionTypeValue, Record<number, number | undefined>>>(() => createInitialNestedRecordState<number | undefined>(availableQuestionTypes));
  const [submittedMcqs, setSubmittedMcqs] = useState<Record<CurrentQuestionTypeValue, boolean>>(() => createInitialRecordState(availableQuestionTypes, false));
  const [mcqScores, setMcqScores] = useState<Record<CurrentQuestionTypeValue, { userScore: number, scorableQuestions: number, totalQuestions: number } | null>>(() => createInitialRecordState(availableQuestionTypes, null));

  // === Saving/Loading State ===
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [savedNotesItems, setSavedNotesItems] = useState<Array<{key: string, data: SavedNote}>>([]);
  const [savedQuestionSetItems, setSavedQuestionSetItems] = useState<Array<{key: string, data: SavedQuestionSet}>>([]);
  const [isDeletingItem, setIsDeletingItem] = useState<string | null>(null);

   useEffect(() => {
     setChapterContent(initialChapterContent);
   }, [initialChapterContent]);


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

  const validateInputs = (): boolean => {
    setComponentError(null); let isValid = true; let errorMsg = '';
    if (!subject?.trim() || !grade?.trim()) { errorMsg = 'Subject & Grade are required.'; isValid = false; }
    else if (!chapterContent || chapterContent.trim().length < 20) { errorMsg = 'Chapter content is missing or too short (min 20 characters).'; isValid = false; }
    if (!isValid) { toast({ title: 'Input Missing', description: errorMsg, variant: 'destructive' }); setComponentError(errorMsg); }
    return isValid;
  };

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

  const handleMcqOptionSelect = useCallback((questionType: CurrentQuestionTypeValue, questionIndex: number, optionIndex: number) => {
    if (submittedMcqs[questionType]) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionType]: { ...(prev[questionType] || {}), [questionIndex]: optionIndex }
    }));
  }, [submittedMcqs]);

  const logMcqPerformance = async (
    userIdentifier: number | string, // Changed from currentUserId to userIdentifier
    scorePercentage: number,
    currentSubject: string,
    currentGrade: string,
    totalQuestions: number,
    correctAnswers: number
  ) => {
    try {
      const response = await fetch('/api/log-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userIdentifier, // Send as 'id' to match API expectation
          score: scorePercentage,
          subject: currentSubject,
          grade: currentGrade,
          quizType: 'mcq',
          questionsTotal: totalQuestions,
          questionsCorrect: correctAnswers,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        console.error("Failed to log performance:", result.message);
      } else {
        console.log("MCQ performance logged successfully.");
      }
    } catch (error) {
      console.error("Error calling log-performance API:", error);
    }
  };


  const handleSubmitMcq = (questionTypeToSubmit: CurrentQuestionTypeValue) => {
    if (questionTypeToSubmit !== 'multiple-choice') return;
    const currentQuestions = generatedQuestions[questionTypeToSubmit];
    const currentSelected = selectedAnswers[questionTypeToSubmit];
    if (!currentQuestions || currentQuestions.length === 0) { toast({ title: "No Questions", description: "No MCQs to submit.", variant: "default" }); return; }
    let userCorrectAnswers = 0; let scorableQuestionsCount = 0;
    currentQuestions.forEach((q, index) => { const finalCorrectIdx = getFinalMcqCorrectIndex(q); if (typeof finalCorrectIdx === 'number') { scorableQuestionsCount++; const userAnswerIndex = currentSelected?.[index]; if (userAnswerIndex === finalCorrectIdx) { userCorrectAnswers++; } }});

    const scoreData = { userScore: userCorrectAnswers, scorableQuestions: scorableQuestionsCount, totalQuestions: currentQuestions.length };
    setMcqScores(prev => ({ ...prev, [questionTypeToSubmit]: scoreData }));
    setSubmittedMcqs(prev => ({ ...prev, [questionTypeToSubmit]: true }));

    const scorePercentage = scorableQuestionsCount > 0 ? parseFloat(((userCorrectAnswers / scorableQuestionsCount) * 100).toFixed(2)) : 0;

    toast({ title: "MCQ Set Submitted!", description: scorableQuestionsCount > 0 ? `You scored ${userCorrectAnswers}/${scorableQuestionsCount} (${scorePercentage.toFixed(0)}%).` : "Answers submitted.", });

    if (currentUserId && subject && grade) { // Use currentUserId prop here
      logMcqPerformance(
        currentUserId,
        scorePercentage,
        subject,
        grade,
        currentQuestions.length,
        userCorrectAnswers
      );
    } else {
      console.warn("currentUserId, Subject, or Grade not available in DashboardContainer, cannot log performance.");
    }

    const newShowAnswersForTab = { ...(showAnswer[questionTypeToSubmit] || {}) };
    currentQuestions.forEach((_, index) => newShowAnswersForTab[index] = true);
    setShowAnswer(prev => ({...prev, [questionTypeToSubmit]: newShowAnswersForTab }));
  };

  const handleToggleAnswerVisibility = (questionType: CurrentQuestionTypeValue, index: number) => {
    setShowAnswer((prev) => {
      const currentTypeAnswers = prev[questionType] ?? {};
      return {
        ...prev,
        [questionType]: { ...currentTypeAnswers, [index]: !currentTypeAnswers[index] }
      };
    });
  };


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

const handleDownloadNotesPdf = async () => {
    if (!generatedNotes.trim()) { toast({ title: "Cannot Download", description: "No notes generated.", variant: "destructive" }); return; }
    const { id: generatingToastId, dismiss: dismissGeneratingToast } = toast({ title: "Generating Visual PDF...", description: "Please wait...", duration: Infinity, });
    try {
      let logoDataUrl: string | null = null; try { logoDataUrl = await loadImageData('/logo.png'); } catch (e: any) { console.warn("Logo load error:", e.message); }

      const captureContainer = document.createElement('div');
      captureContainer.id = 'pdf-visual-capture-area';
      Object.assign(captureContainer.style, { position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', padding: '20px', background: 'white' });
      if (document.documentElement.classList.contains('dark')) { captureContainer.classList.add('dark'); }
      document.body.appendChild(captureContainer);

      const reactRoot = ReactDOM.createRoot(captureContainer);
      reactRoot.render( <React.StrictMode> <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"> <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownPdfComponents}>{generatedNotes}</ReactMarkdown> </div> </React.StrictMode> );
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mainCanvas = await html2canvas(captureContainer, {
          scale: 2, useCORS: true, logging: false, removeContainer: false,
          onclone: (clonedDoc) => {
              const isDark = document.documentElement.classList.contains('dark');
              clonedDoc.documentElement.classList.toggle('dark', isDark);
              clonedDoc.body.classList.toggle('dark', isDark);
          }
      });
      reactRoot.unmount(); document.body.removeChild(captureContainer);

      const pdfDoc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pdfW = pdfDoc.internal.pageSize.getWidth();
      const pdfH = pdfDoc.internal.pageSize.getHeight();
      const margin = 40;
      const footerH_pdf = 50;
      const contentW = pdfW - margin * 2;
      const imgOrigW = mainCanvas.width;
      const imgOrigH = mainCanvas.height;
      const pdfImgRenderW = contentW;
      const scale = pdfImgRenderW / imgOrigW;
      let yOffset = 0;
      let pageNum = 0;

      const addHeader = (): number => {
          let hY = margin;
          if (logoDataUrl) { const logoS=30; pdfDoc.addImage(logoDataUrl,'PNG',pdfW-margin-logoS,margin-15,logoS,logoS); hY=Math.max(hY,margin-15+logoS+10); }
          pdfDoc.setFont('helvetica','bold').setFontSize(14);

          let titleString = `Study Notes: ${subject||'Notes'}`;
          if (grade) titleString += ` - G${grade}`;
          if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage >= startPage) {
            titleString += ` (Pages ${startPage}-${endPage})`;
          }

          const titleLines = pdfDoc.splitTextToSize(titleString,pdfW-margin*2-(logoDataUrl?45:0));
          pdfDoc.text(titleLines,margin,hY);
          hY+=pdfDoc.getTextDimensions(titleLines.join('\n')).h+10;
          pdfDoc.setLineWidth(.5).line(margin,hY,pdfW-margin,hY); return hY+15;
      };
      const addFooter = (pg: number, total: number) => {
          const fSY=pdfH-margin-footerH_pdf+10;
          pdfDoc.setLineWidth(.2).line(margin,fSY,pdfW-margin,fSY);
          let cFY=fSY+15;
          pdfDoc.setFontSize(8).setFont('helvetica','italic');

          const telegramText = "Telegram: @grade9to12ethiopia";
          const telegramUrl = "https://t.me/grade9to12ethiopia";
          pdfDoc.setTextColor(0, 0, 238);
          pdfDoc.textWithLink(telegramText, margin, cFY, { url: telegramUrl });
          pdfDoc.setTextColor(0,0,0);

          const pTxt=`Page ${pg} of ${total}`;
          pdfDoc.text(pTxt,pdfW-margin-pdfDoc.getTextWidth(pTxt),cFY);
      };

      while (yOffset < imgOrigH) {
          pageNum++; if (pageNum > 1) pdfDoc.addPage();
          pdfDoc.setPage(pageNum);
          const contentSY = addHeader();
          const availH = pdfH - contentSY - margin - footerH_pdf;
          if (availH <= 0) { if (pageNum > 50) {console.error("PDF gen error (notes): available height too small."); break;} continue; }
          let segH = availH / scale;
          segH = Math.min(segH, imgOrigH - yOffset);
          if (segH <= 0) break;
          const segCan = document.createElement('canvas'); segCan.width = imgOrigW; segCan.height = segH;
          const segCtx = segCan.getContext('2d');
          if (segCtx) {
              segCtx.drawImage(mainCanvas, 0, yOffset, imgOrigW, segH, 0, 0, imgOrigW, segH );
              pdfDoc.addImage(segCan.toDataURL('image/png'), 'PNG', margin, contentSY, pdfImgRenderW, segH * scale );
          }
          yOffset += segH;
      }
      const totalPgs = pdfDoc.getNumberOfPages();
      for (let i = 1; i <= totalPgs; i++) { pdfDoc.setPage(i); addFooter(i, totalPgs); }

      let fName = `${(subject||'Notes').replace(/ /g,'_')}_G${grade||'N_A'}`;
      if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage >= startPage) {
        fName += `_p${startPage}-${endPage}`;
      }
      fName += `_Notes_Visual.pdf`;
      pdfDoc.save(fName);

      dismissGeneratingToast(); toast({ title: "Visual PDF Generated!", description: `${fName} downloading.`, duration: 7000 });
    } catch (error: any) { console.error("Visual PDF Error:", error); dismissGeneratingToast(); toast({ title: "PDF Error", description: error.message || "Could not generate visual PDF.", variant: "destructive" }); }
  };

  const handleDownloadQuestionsPdf = async () => {
      const questionsToDownload = generatedQuestions[activeQuestionTab];
      const currentQuestionTypeTitle = questionTypeTitles[activeQuestionTab];
      if (!questionsToDownload || questionsToDownload.length === 0) { toast({ title: "Cannot Download", description: `No ${currentQuestionTypeTitle} questions.`, variant: "destructive"}); return; }
      const { id: genQToastId, dismiss: dismissGenQToast } = toast({ title: `Generating ${currentQuestionTypeTitle} PDF...`, description:"Please wait.", duration: Infinity });
      try {
          let logoDataUrl: string | null = null; try { logoDataUrl = await loadImageData('/logo.png'); } catch (e:any) { console.warn("Logo PDF fail:", e.message); }

          const pdfDoc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
          const pageH = pdfDoc.internal.pageSize.height; const pageW = pdfDoc.internal.pageSize.width;
          const margin = 40; const lineMaxW = pageW - margin * 2; let yPos = margin;
          const footerReserve = 60;
          let currentPageNum = 1;

          const addPageWithHeader = (): number => {
              if (currentPageNum > 1) { pdfDoc.addPage(); }
              pdfDoc.setPage(currentPageNum); let currentY = margin;
              if (logoDataUrl) { const logoS=30; pdfDoc.addImage(logoDataUrl, 'PNG', pageW - margin - logoS, margin - 15, logoS, logoS); currentY = Math.max(currentY, margin - 15 + logoS + 10); }
              pdfDoc.setFont("helvetica", "bold").setFontSize(14);

              let title = `Practice Questions: ${subject || 'Unknown'}`;
              if (grade) title += ` - Grade ${grade}`;
              if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage >= startPage) {
                title += ` (Pages ${startPage}-${endPage})`;
              }

              const titleLines = pdfDoc.splitTextToSize(title, lineMaxW - (logoDataUrl ? 45 : 0));
              pdfDoc.text(titleLines, margin, currentY);
              currentY += pdfDoc.getTextDimensions(titleLines.join('\n')).h + 5;
              pdfDoc.setFont("helvetica", "italic").setFontSize(12);
              const typeTxt = `Type: ${currentQuestionTypeTitle}`;
              pdfDoc.text(typeTxt, margin, currentY);
              currentY += pdfDoc.getTextDimensions(typeTxt).h + 10;
              pdfDoc.setLineWidth(0.5).line(margin, currentY, pageW - margin, currentY); return currentY + 15;
          };
          const addFooterToPage = (pageNum: number, totalPages: number) => {
              pdfDoc.setPage(pageNum);
              const footSY = pageH - margin - footerReserve + 10;
              pdfDoc.setLineWidth(0.2).line(margin, footSY, pageW - margin, footSY);
              let currentFooterY = footSY + 15;
              pdfDoc.setFontSize(8).setFont('helvetica', 'italic');

              const telegramText = "Telegram: @grade9to12ethiopia";
              const telegramUrl = "https://t.me/grade9to12ethiopia";
              pdfDoc.setTextColor(0, 0, 238);
              pdfDoc.textWithLink(telegramText, margin, currentFooterY, { url: telegramUrl });
              pdfDoc.setTextColor(0,0,0);

              const pageNumText = `Page ${pageNum} of ${totalPages}`;
              pdfDoc.text(pageNumText, pageW - margin - pdfDoc.getTextWidth(pageNumText), currentFooterY);
          };
          const addTextWithPotentialPageBreak = (text: string | null | undefined, x: number, currentY: number, options?: any): number => {
              if (!text || !text.trim()) return currentY; const fontSize = options?.fontSize || 10; const fontStyle = options?.fontStyle || 'normal'; const textMaxWidth = options?.maxWidth || lineMaxW; pdfDoc.setFontSize(fontSize).setFont('helvetica', fontStyle); const lines = pdfDoc.splitTextToSize(text, textMaxWidth); const lineHeight = pdfDoc.getLineHeightFactor() * fontSize * (options?.lineHeightFactor || 1.0); let newY = currentY;
              for (const line of lines) { if (newY + lineHeight > pageH - margin - footerReserve) { addFooterToPage(currentPageNum, 0); currentPageNum++; newY = addPageWithHeader(); pdfDoc.setFontSize(fontSize).setFont('helvetica', fontStyle); } pdfDoc.text(line, x, newY); newY += lineHeight; } return newY + (fontSize * 0.15);
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
              if (index < questionsToDownload.length - 1) { if (yPos + 15 > pageH - margin - footerReserve) { addFooterToPage(currentPageNum, 0); currentPageNum++; yPos = addPageWithHeader(); } else { pdfDoc.setLineWidth(0.2).line(margin, yPos, pageW - margin, yPos); yPos += 10; }}
          });

          const finalTotalPages = currentPageNum;
          for (let i = 1; i <= finalTotalPages; i++) { addFooterToPage(i, finalTotalPages); }

          dismissGenQToast();
          let filename = `${(subject || 'Questions').replace(/ /g,'_')}_G${grade || 'N_A'}`;
          if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage >= startPage) {
            filename += `_p${startPage}-${endPage}`;
          }
          filename += `_${activeQuestionTab}_Qs.pdf`;
          pdfDoc.save(filename);
          toast({ title: "Download Started", description: `Downloading ${filename}`});
      } catch(error: any) { dismissGenQToast(); console.error("Error Qs PDF:", error); toast({ title: "PDF Error", description: `Qs PDF: ${error.message || 'Unknown'}.`, variant: "destructive"}); }
  };

  const markdownDisplayComponents: ReactMarkdownComponents = {
    table: ({node, ...props}) => <div className="overflow-x-auto w-full my-4 border border-border rounded-md shadow-sm"><table {...props} className="min-w-full divide-y divide-border text-sm"/></div>,
    thead: ({node, ...props}) => <thead {...props} className="bg-muted/50"/>,
    th: ({node, children, ...props }) => <th {...props} className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{React.Children.map(children, child => String(child))}</th>,
    td: ({node, children, ...props }) => <td {...props} className="px-3 py-2 text-muted-foreground">{React.Children.map(children, child => String(child))}</td>,
    pre: ({node, children, ...props}) => ( <div className="overflow-x-auto w-full bg-muted p-3 my-2 rounded-md text-sm"> <pre {...props} className="whitespace-pre-wrap">{children}</pre> </div> ),
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
    code: ({ node, children, className, ...props }) => {
        const childString = React.Children.toArray(children).map(String).join('');
        const match = /language-(\w+)/.exec(className || '');
        if (match) {
            return ( <code className={className} {...props}> {childString.replace(/\n$/, '')} </code> );
        }
        return ( <code className={`bg-muted/70 text-muted-foreground px-1 py-0.5 rounded font-mono text-xs ${className || ''}`} {...props}> {childString} </code> );
    }
  };
  const markdownPdfComponents: ReactMarkdownComponents = {
    img: ({node, ...props}) => <img {...props} crossOrigin="anonymous" style={{maxWidth: '100%', height: 'auto'}} />,
    table: ({node, children, ...props}) => <table {...props} style={{width: '100%', borderCollapse: 'collapse', fontSize:'9pt', margin:'8px 0'}}>{children}</table>,
    th: ({node, children, ...props}) => <th {...props} style={{border:'1px solid #ddd', padding:'3px', textAlign:'left', fontWeight:'bold', backgroundColor:'#f9f9f9'}}>{React.Children.map(children, child => String(child))}</th>,
    td: ({node, children, ...props}) => <td {...props} style={{border:'1px solid #ddd', padding:'3px', textAlign:'left'}}>{React.Children.map(children, child => String(child))}</td>,
  };

  const isAnyOperationPending = isGeneratingNotes || Object.values(isGeneratingQuestions).some(Boolean) || isSavingNotes || isSavingQuestions;

  return (
    <>
      {componentError && ( <div className="mb-4 md:mb-6 p-4 border border-destructive bg-destructive/10 rounded-lg text-destructive flex items-start text-sm shadow-md"> <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5"/> <div><p className="font-semibold mb-1">Generation Error</p><p>{componentError}</p></div> </div> )}

      <GenerationControlsCard
        isGeneratingNotes={isGeneratingNotes}
        isGeneratingAnyQuestion={Object.values(isGeneratingQuestions).some(Boolean)}
        isAnyOperationPending={isAnyOperationPending}
        componentError={componentError}
        onGenerateNotes={handleGenerateNotes}
        onGenerateQuestions={handleGenerateQuestions}
      />

      <Separator className="my-8 md:my-10" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <NotesCard
          generatedNotes={generatedNotes}
          isGeneratingNotes={isGeneratingNotes}
          noteGenerationMessage={noteGenerationMessage}
          isSavingNotes={isSavingNotes}
          onSaveNotes={handleSaveNotesToLocalStorage}
          onDownloadNotesPdf={handleDownloadNotesPdf}
          savedNotesItems={savedNotesItems}
          onLoadNote={handleLoadSavedNote}
          onDeleteNote={handleDeleteSavedItem}
          isDeletingSavedNoteKey={isDeletingItem}
          markdownDisplayComponents={markdownDisplayComponents}
          isAnyOtherMajorOpPending={Object.values(isGeneratingQuestions).some(Boolean) || isSavingQuestions}
        />

        <QuestionsHubCard
          activeQuestionTab={activeQuestionTab}
          onTabChange={setActiveQuestionTab}
          generatedQuestions={generatedQuestions}
          isGeneratingQuestions={isGeneratingQuestions}
          questionGenerationMessage={questionGenerationMessage}
          selectedAnswers={selectedAnswers}
          submittedMcqs={submittedMcqs}
          mcqScores={mcqScores}
          onMcqOptionSelect={handleMcqOptionSelect}
          onSubmitMcq={handleSubmitMcq}
          showAnswer={showAnswer}
          onToggleAnswerVisibility={handleToggleAnswerVisibility}
          componentError={componentError}
          isGeneratingNotes={isGeneratingNotes}
          onDownloadQuestionsPdf={() => handleDownloadQuestionsPdf()} // Simplified call
          isSavingQuestions={isSavingQuestions}
          onSaveQuestionSet={() => handleSaveQuestionSet(activeQuestionTab)} // Pass active tab
          savedQuestionSetItems={savedQuestionSetItems}
          onLoadSavedQuestionSet={handleLoadSavedQuestionSet}
          onDeleteSavedQuestionSet={handleDeleteSavedItem}
          isDeletingSavedQuestionSetKey={isDeletingItem}
        />
      </div>
    </>
  );
};

export default DashboardContainer;
