// src/components/Dashboard.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  generateStudyQuestions,
  GenerateStudyQuestionsInput,
  // GenerateStudyQuestionsOutput, // Not used here
} from '@/ai/flows/generate-study-questions';
import { generateNotes, 
    // GenerateNotesOutput // Not used here
} from '@/ai/flows/generate-notes';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { jsPDF } from "jspdf";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, EyeOff, Loader2, AlertCircle, FileText, HelpCircle, ListChecks, Sparkles, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { loadImageData } from '@/lib/imageUtils';
import html2canvas from 'html2canvas'; // Import html2canvas

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
  startPage?: number;
  endPage?: number;
}


const Dashboard: React.FC<DashboardProps> = ({
  chapterContent: initialChapterContent,
  subject,
  grade,
  startPage,
  endPage
}) => {
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

  const initialQuestionState = useMemo(() => createInitialRecordState(availableQuestionTypes, []), []);
  const initialLoadingState = useMemo(() => createInitialRecordState(availableQuestionTypes, false), []);
  const initialMessageState = useMemo(() => createInitialRecordState<string | null>(availableQuestionTypes, null), []);
  const initialShowAnswerState = useMemo(() => createInitialNestedRecordState<boolean>(availableQuestionTypes), []);

  useEffect(() => { setChapterContent(initialChapterContent); setGeneratedNotes(''); setIsGeneratingNotes(false); setNoteGenerationMessage(null); setGeneratedQuestions(initialQuestionState); setIsGeneratingQuestions(initialLoadingState); setQuestionGenerationMessage(initialMessageState); setShowAnswer(initialShowAnswerState); setComponentError(null); setActiveQuestionTab('multiple-choice'); }, [initialChapterContent, subject, grade, initialQuestionState, initialLoadingState, initialMessageState, initialShowAnswerState]);

  const getCorrectAnswerLetter = (index?: number): string | null => { if (typeof index !== 'number' || index < 0 || index > 3) return null; return String.fromCharCode(65 + index); };
  const toggleShowAnswer = ( questionType: CurrentQuestionTypeValue, index: number ) => { setShowAnswer((prev) => { const current = prev[questionType] ?? {}; return { ...prev, [questionType]: { ...current, [index]: !current[index] } }; }); };
  const validateInputs = (): boolean => { setComponentError(null); let isValid = true; let errorMsg = ''; if (!subject || !grade) { errorMsg = 'Grade & Subject required.'; isValid = false; } else if (!chapterContent || chapterContent.trim().length < 20) { errorMsg = 'Chapter content missing or too short.'; isValid = false; } if (!isValid) { toast({ title: 'Input Missing', description: errorMsg, variant: 'destructive' }); setComponentError(errorMsg); } return isValid; };

  const renderInlineFormatting = (text: string | null | undefined): string => { if (!text) return ''; let html = text; html = html.replace(/</g, '<').replace(/>/g, '>'); html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); html = html.replace(/__(.*?)__/g, '<strong>$1</strong>'); html = html.replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '<em>$1</em>'); html = html.replace(/(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g, '<em>$1</em>'); html = html.replace(/`(.*?)`/g, '<code class="bg-muted text-muted-foreground px-1 py-0.5 rounded font-mono text-sm">$1</code>'); html = html.replace(/__+/g, '<span class="italic text-muted-foreground">[blank]</span>'); return html; };
  const renderQuestionContent = ( questionType: CurrentQuestionTypeValue, question: Question, index: number ): React.ReactNode => {
    const isShowingAnswer = showAnswer[questionType]?.[index] || false;
    const isMCQ = questionType === 'multiple-choice';
    const AnswerReveal = ({ derivedLetter, originalLetter }: { derivedLetter: string | null, originalLetter: string | null }) => { const displayLetter = isMCQ ? (derivedLetter ?? originalLetter) : null; return ( <div className="mt-3 p-3 md:p-4 bg-muted/70 dark:bg-muted/40 rounded-md border border-border/50 space-y-2 md:space-y-3 text-xs md:text-sm"> {isMCQ ? ( displayLetter ? ( <p className="font-semibold text-green-700 dark:text-green-400"> Correct Answer: {displayLetter} {derivedLetter && !originalLetter && ( <span className="text-xs font-normal text-muted-foreground ml-2">(Derived from ✓)</span> )} </p> ) : ( <p className="font-semibold text-orange-600 dark:text-orange-400"> Correct answer could not be determined. </p> ) ) : question.answer?.trim() ? ( <div> <strong className="text-foreground/80 block mb-1">Answer:</strong> <span className="block pl-2" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(question.answer), }} /> </div> ) : ( <p className="font-semibold text-red-600 dark:text-red-400"> Answer not provided. </p> )} {question.explanation?.trim() ? ( <div className="text-muted-foreground mt-2 pt-2 border-t border-border/30"> <strong className="text-foreground/80 block mb-1">Explanation:</strong> <span className="block pl-2" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(question.explanation), }} /> </div> ) : ( (isMCQ || questionType === 'true-false') && isShowingAnswer && <p className="text-muted-foreground italic mt-2 pt-2 border-t border-border/30 text-xs"> Explanation not provided{isMCQ && !displayLetter ? ' (and answer is undetermined)' : ''}. </p> )} </div> ); };
    const RevealButton = () => ( <Button variant="outline" size="sm" onClick={() => toggleShowAnswer(questionType, index)} className="mt-3 transition-colors text-xs"> {isShowingAnswer ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />} {isShowingAnswer ? 'Hide' : 'Show'} Answer/Explanation </Button> );
    if (isMCQ) { const options = question.options ?? []; let derivedCorrectIndex: number | null = null; let derivedCorrectLetter: string | null = null; let cleanedOptions = options; let originalCorrectLetter = (typeof question.answer === 'string' && /^[A-D]$/i.test(question.answer)) ? question.answer.toUpperCase() : null; let originalCorrectIndex = (typeof question.correctAnswerIndex === 'number' && question.correctAnswerIndex >= 0 && question.correctAnswerIndex < 4) ? question.correctAnswerIndex : null; if (originalCorrectLetter === null || originalCorrectIndex === null || options.length !== 4) { cleanedOptions = options.map((opt, optIndex) => { if (typeof opt === 'string' && opt.includes('✓')) { if (derivedCorrectIndex === null) { derivedCorrectIndex = optIndex; derivedCorrectLetter = getCorrectAnswerLetter(optIndex); } return opt.replace(/✓/g, '').trim(); } return opt; }); if (derivedCorrectIndex !== null) { originalCorrectLetter = null; originalCorrectIndex = null; } } else { cleanedOptions = options.map(opt => typeof opt === 'string' ? opt.replace(/✓/g, '').trim() : opt); } const finalCorrectIndex = derivedCorrectIndex ?? originalCorrectIndex; const finalOriginalLetterForReveal = originalCorrectLetter; const finalDerivedLetterForReveal = derivedCorrectLetter; return ( <div className="mt-2 md:mt-3 space-y-1.5 md:space-y-2"> <ul className="list-none p-0 space-y-1.5 md:space-y-2"> {cleanedOptions.length === 4 ? ( cleanedOptions.map((choice, choiceIndex) => { const L = getCorrectAnswerLetter(choiceIndex); const isCorrect = isShowingAnswer && finalCorrectIndex === choiceIndex; return ( <li key={choiceIndex} className={`flex items-center p-2 md:p-2.5 rounded-md border text-xs md:text-sm transition-all duration-150 ease-in-out ${ isShowingAnswer ? isCorrect ? 'bg-green-100 dark:bg-green-900/60 border-green-400 dark:border-green-600 font-medium ring-1 ring-green-500' : 'bg-background/70 border-border hover:bg-muted/50' : 'bg-background border-input hover:border-primary/50 hover:bg-muted/40 cursor-pointer' }`}> <span className="font-semibold mr-2 text-primary/80 w-4 md:w-5">{L ?? '?'}:</span> <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(choice) }} /> </li> ); }) ) : ( <li className="text-xs md:text-sm text-red-600 italic p-2 border border-red-300 rounded bg-red-50 dark:bg-red-900/30"> Warning: Incorrect number of options ({cleanedOptions.length}). </li> )} </ul> <RevealButton /> {isShowingAnswer && <AnswerReveal derivedLetter={finalDerivedLetterForReveal} originalLetter={finalOriginalLetterForReveal} />} </div> ); }
    else { return ( <div className="mt-2 md:mt-3"> <RevealButton /> {isShowingAnswer && <AnswerReveal derivedLetter={null} originalLetter={null} />} </div> ); }
  };

  const handleGenerateNotes = async () => { if (!validateInputs()) return; setGeneratedNotes(''); setIsGeneratingNotes(true); setNoteGenerationMessage("AI generating notes..."); try { const result = await generateNotes({ textbookChapter: chapterContent, gradeLevel: `${grade}th Grade`, subject: subject }); if (result?.notes?.trim()) { setGeneratedNotes(result.notes); toast({ title: "Success!", description: "Notes generated." }); } else { throw new Error("AI returned empty notes."); } } catch (error: any) { const msg = error.message || 'Unknown error.'; toast({ title: "Notes Error", description: msg, variant: "destructive" }); setComponentError(msg); setGeneratedNotes(''); } finally { setIsGeneratingNotes(false); setNoteGenerationMessage(null); } };
  const handleGenerateQuestions = async (questionType: CurrentQuestionTypeValue) => { if (!validateInputs()) return; const typeTitle = questionTypeTitles[questionType]; setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] })); setShowAnswer(prev => ({ ...prev, [questionType]: {} })); setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: true })); setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: `AI generating ${typeTitle}...` })); setComponentError(null); try { const numQuestionsToRequest = 10; const inputData: GenerateStudyQuestionsInput = { chapterContent: chapterContent, questionType: questionType, numberOfQuestions: numQuestionsToRequest, gradeLevel: `${grade}th Grade`, subject: subject }; const result = await generateStudyQuestions(inputData); if (result?.questions && Array.isArray(result.questions)) { const questionsReceived = result.questions as Question[]; if (questionsReceived.length > 0 || numQuestionsToRequest === 10) { toast({ title: "Success!", description: `${questionsReceived.length} ${typeTitle} questions generated.` }); setGeneratedQuestions(prev => ({ ...prev, [questionType]: questionsReceived })); } else { toast({ title: "No Questions", description: `AI returned 0 ${typeTitle} questions.`, variant: "default" }); setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] })); } } else { throw new Error("Invalid question structure received."); } } catch (error: any) { const msg = error.message || `Unknown error.`; toast({ title: "Question Error", description: msg, variant: "destructive" }); setComponentError(msg); setGeneratedQuestions(prev => ({ ...prev, [questionType]: [] })); } finally { setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: false })); setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: null })); } };

  // Refined handleDownloadNotesPdf using html2canvas for better visual fidelity
  const handleDownloadNotesPdf = async () => {
    if (!generatedNotes.trim()) {
      toast({ title: "Cannot Download", description: "No notes generated.", variant: "destructive" });
      return;
    }

    const { id: generatingToastId, dismiss: dismissGeneratingToast } = toast({
      title: "Generating Visual PDF...",
      description: "Please wait. This may take a few moments for complex notes.",
      duration: Infinity,
    });

    try {
      let logoDataUrl: string | null = null;
      try {
        logoDataUrl = await loadImageData('/logo.png');
      } catch (imgError: any) {
        console.warn("Could not load logo for PDF:", imgError.message);
      }

      const captureContainer = document.createElement('div');
      captureContainer.id = 'pdf-visual-capture-area'; // For debugging
      captureContainer.style.position = 'absolute';
      captureContainer.style.left = '-9999px'; // Off-screen rendering
      captureContainer.style.top = '-9999px';
      captureContainer.style.width = '800px'; // A good base width for capturing prose styles
      captureContainer.style.padding = '20px'; // Match some padding if your prose has it visually
      captureContainer.style.background = 'white'; // Critical for html2canvas background
      
      // Propagate dark mode to the capture container if active
      if (document.documentElement.classList.contains('dark')) {
        captureContainer.classList.add('dark');
      }
      document.body.appendChild(captureContainer);
      
      const reactRoot = ReactDOM.createRoot(captureContainer);
      reactRoot.render(
        <React.StrictMode>
          {/* The wrapper with prose classes is crucial here for styling */}
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div className="my-4 overflow-x-auto rounded-md border border-slate-300 dark:border-slate-700">
                    <table {...props} className="w-full" />
                  </div>
                ),
                 // Potentially override other components for better capture if needed
                img: ({node, ...props}) => <img {...props} crossOrigin="anonymous" />
              }}
            >
              {generatedNotes}
            </ReactMarkdown>
          </div>
        </React.StrictMode>
      );

      // Ensure rendering and styles are fully applied before capture
      await new Promise(resolve => setTimeout(resolve, 1500)); // Adjust delay as needed

      const mainCanvas = await html2canvas(captureContainer, {
        scale: 2, // Higher scale improves resolution in the PDF
        useCORS: true, // If notes might contain external images
        logging: process.env.NODE_ENV === 'development',
        removeContainer: false, // Keep the container until explicitly removed,
        onclone: (clonedDoc) => {
          // Ensure dark mode styling is correctly applied to the cloned document for capture
          if (document.documentElement.classList.contains('dark')) {
            clonedDoc.documentElement.classList.add('dark');
            // Also add to body if your dark styles require it (e.g. for body background)
            clonedDoc.body.classList.add('dark'); 
          } else {
            clonedDoc.documentElement.classList.remove('dark');
            clonedDoc.body.classList.remove('dark');
          }
        }
      });
      
      // Cleanup the temporary React root and DOM element
      reactRoot.unmount();
      document.body.removeChild(captureContainer);

      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pdfPageWidth = doc.internal.pageSize.getWidth();
      const pdfPageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pdfPageWidth - margin * 2;

      const imgOriginalWidth = mainCanvas.width;
      const imgOriginalHeight = mainCanvas.height;
      const imgAspectRatio = imgOriginalWidth / imgOriginalHeight;
      
      const pdfImageRenderWidth = contentWidth; // Image will span the content width
      const pdfImageRenderHeight = pdfImageRenderWidth / imgAspectRatio; // Total height the image will occupy in PDF if rendered as one piece

      let pageNumber = 0;
      let yPosOnPdfPage = 0; // Current Y position on the PDF page for drawing
      let sourceImageYOffset = 0; // How much of the source canvas image we've already drawn (in source canvas pixels)

      // Helper to add headers & footers, returning usable Y after header
      const addHeaderAndFooterOnPage = (currentPageNum: number, totalPages: number, isNewPage: boolean): number => {
          if(isNewPage) pageNumber++; else pageNumber = currentPageNum; // manage page number

          let headerY = margin;
          if (logoDataUrl) {
              const logoW = 30, logoH = 30;
              doc.addImage(logoDataUrl, 'PNG', pdfPageWidth - margin - logoW, margin - 15, logoW, logoH);
              headerY = Math.max(headerY, margin - 15 + logoH + 10);
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          const titleText = `Study Notes: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`;
          const maxTitleWidth = logoDataUrl ? pdfPageWidth - margin * 2 - 40 : pdfPageWidth - margin * 2;
          const titleLines = doc.splitTextToSize(titleText, maxTitleWidth);
          doc.text(titleLines, margin, headerY);
          headerY += titleLines.length * 14 * 0.8 + 10; // Line height factor

          doc.setLineWidth(0.5);
          doc.line(margin, headerY, pdfPageWidth - margin, headerY);
          headerY += 15; // Space after header line

          // Footer (drawn later for current page to know total pages)
          return headerY; // This is where the content (image segment) can start
      };
      
      const drawFooter = (currentPageNum: number, totalPages: number) => {
          let footerY = pdfPageHeight - margin;
          doc.setLineWidth(0.2);
          doc.line(margin, footerY - 25, pdfPageWidth - margin, footerY - 25);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          
          let footerLineOffset = -15;
          if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) {
              doc.text(`Source Pages: ${startPage} - ${endPage}`, margin, footerY + footerLineOffset);
              footerLineOffset += 10;
          }
          doc.setTextColor(60,60,60);
          doc.text("Join Telegram: https://t.me/grade9to12ethiopia", margin, footerY + footerLineOffset);
          doc.setTextColor(0,0,0);
          const pageText = `Page ${currentPageNum} of ${totalPages}`;
          doc.text(pageText, pdfPageWidth - margin - doc.getTextWidth(pageText), footerY + footerLineOffset);
      }

      yPosOnPdfPage = addHeaderAndFooterOnPage(1, 0, true); // Initial header, totalPages unknown for now

      while (sourceImageYOffset < imgOriginalHeight) {
        if (pageNumber > 1) { // Add new page if not the first
          doc.addPage();
          yPosOnPdfPage = addHeaderAndFooterOnPage(pageNumber, 0, true);
        }

        // Calculate how much of the image can fit on the current PDF page
        const availablePdfHeightForImage = pdfPageHeight - yPosOnPdfPage - margin - 30; // 30 for footer space
        
        // Calculate the height of the segment to be cut from the source canvas
        // This segment, when scaled to pdfImageRenderWidth, should fit availablePdfHeightForImage
        let sourceSegmentHeight = (availablePdfHeightForImage / pdfImageRenderWidth) * imgOriginalWidth;
        sourceSegmentHeight = Math.min(sourceSegmentHeight, imgOriginalHeight - sourceImageYOffset); // Don't exceed remaining image

        if (sourceSegmentHeight <= 0) break; // No more content or no space

        // Create a temporary canvas for the segment
        const segmentCanvas = document.createElement('canvas');
        segmentCanvas.width = imgOriginalWidth;
        segmentCanvas.height = sourceSegmentHeight;
        const segmentCtx = segmentCanvas.getContext('2d');

        if (segmentCtx) {
          // Draw the segment from the main canvas to the temporary segment canvas
          segmentCtx.drawImage(
            mainCanvas,
            0,                         // Source X
            sourceImageYOffset,        // Source Y (where to start cropping from main canvas)
            imgOriginalWidth,          // Source Width
            sourceSegmentHeight,       // Source Height (height of the segment to crop)
            0,                         // Destination X on segment canvas
            0,                         // Destination Y on segment canvas
            imgOriginalWidth,          // Destination Width on segment canvas
            sourceSegmentHeight        // Destination Height on segment canvas
          );

          const segmentDataUrl = segmentCanvas.toDataURL('image/png');
          const segmentPdfHeight = (sourceSegmentHeight / imgOriginalWidth) * pdfImageRenderWidth;

          doc.addImage(
            segmentDataUrl,
            'PNG',
            margin,                 // X position in PDF
            yPosOnPdfPage,          // Y position in PDF (after header)
            pdfImageRenderWidth,    // Width of image in PDF
            segmentPdfHeight        // Height of image segment in PDF
          );
        }
        sourceImageYOffset += sourceSegmentHeight;
      }

      // Add footers to all pages now that we know the total
      const totalPages = doc.getNumberOfPages();
      for(let i=1; i <= totalPages; i++) {
          doc.setPage(i);
          drawFooter(i, totalPages);
      }

      const pageRangeString = (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) ? `_p${startPage}-${endPage}` : '';
      const filename = `${subject.replace(/ /g, '_') || 'Notes'}_Grade${grade || 'N_A'}${pageRangeString}_Notes_Visual.pdf`;
      doc.save(filename);

      dismissGeneratingToast();
      toast({
        title: "Visual PDF Generated!",
        description: `${filename} downloading. Text is not selectable.`,
        duration: 7000
      });

    } catch (error) {
      console.error("Error generating visual Notes PDF:", error);
      dismissGeneratingToast();
      toast({ title: "PDF Error", description: "Could not generate visual PDF. Check console for details.", variant: "destructive" });
    }
  };
  
  // --- handleDownloadQuestionsPdf (Kept as text-based for now) ---
  const handleDownloadQuestionsPdf = async () => {
    const questionsToDownload = generatedQuestions[activeQuestionTab]; const currentQuestionTypeTitle = questionTypeTitles[activeQuestionTab];
    if (!questionsToDownload || questionsToDownload.length === 0) { toast({ title: "Cannot Download", description: `No ${currentQuestionTypeTitle} questions generated.`, variant: "destructive"}); return; }
    try {
        let logoDataUrl: string | null = null;
        try { logoDataUrl = await loadImageData('/logo.png'); }
        catch (imgError: any) { console.warn("Could not load logo for PDF:", imgError.message); }

        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        const pageHeight = doc.internal.pageSize.height; const pageWidth = doc.internal.pageSize.width; const margin = 40; const maxLineWidth = pageWidth - margin * 2; let yPos = margin; const footerBuffer = 40; // Space for footer content
        const contentEndY = pageHeight - margin - footerBuffer; // Where content must stop


        let currentPageNumForQuestions = 1; // Manual page tracking for questions PDF
        let totalEstPagesForQuestions = 1; // Start with 1, can be refined

        // Function to add header, returns Y pos for content
        const addLogoAndQuestionHeader = (currentDoc: jsPDF, headerMargin: number): number => {
             let currentY = headerMargin;
             if (logoDataUrl) {
                 const logoW = 30; const logoH = 30;
                 const logoX = currentDoc.internal.pageSize.width - headerMargin - logoW;
                 currentDoc.addImage(logoDataUrl!, 'PNG', logoX, headerMargin - 15, logoW, logoH);
                 currentY = Math.max(currentY, headerMargin - 15 + logoH + 10);
             }
            currentDoc.setFont("helvetica", "bold");
            currentDoc.setFontSize(14);
            const titleText = `Practice Questions: ${subject || 'Unknown'} - Grade ${grade || 'N/A'}`;
            const maxTitleWidth = logoDataUrl ? currentDoc.internal.pageSize.width - headerMargin * 2 - 40 : currentDoc.internal.pageSize.width - headerMargin * 2;
            const titleLines = currentDoc.splitTextToSize(titleText, maxTitleWidth);
            currentDoc.text(titleLines, headerMargin, currentY);
            currentY += titleLines.length * 14 * 0.8; 
            
            currentDoc.setFontSize(12); currentDoc.setFont("helvetica", "italic");
            const typeText = `Type: ${currentQuestionTypeTitle}`;
            const typeLines = currentDoc.splitTextToSize(typeText, maxTitleWidth);
            currentDoc.text(typeLines, headerMargin, currentY);
            currentY += typeLines.length * 12 * 0.8 + 10; 
            
            currentDoc.setLineWidth(0.5); currentDoc.line(headerMargin, currentY, currentDoc.internal.pageSize.width - headerMargin, currentY); currentY += 15;
            return currentY;
        };
        
        // Function to add footer
        const addQuestionFooter = (currentDoc: jsPDF, pageNum: number, totalPages: number) => {
            const ph = currentDoc.internal.pageSize.height;
            const pw = currentDoc.internal.pageSize.width;
            const m = margin; // Use component-level margin

            let footerY = ph - m;
            currentDoc.setLineWidth(0.2);
            currentDoc.line(m, footerY - 25, pw - m, footerY - 25);
            currentDoc.setFontSize(8); currentDoc.setFont('helvetica', 'italic');
            
            let footerLineOffset = -15;
            if (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) {
              currentDoc.text(`Source Pages: ${startPage} - ${endPage}`, m, footerY + footerLineOffset);
              footerLineOffset += 10;
            }
            currentDoc.setTextColor(60, 60, 60);
            currentDoc.text("Join Telegram: https://t.me/grade9to12ethiopia", m, footerY + footerLineOffset);
            currentDoc.setTextColor(0, 0, 0);
            const pageNumText = `Page ${pageNum} of ${totalPages}`; // Use totalPages when known
            currentDoc.text(pageNumText, pw - m - currentDoc.getTextWidth(pageNumText), footerY + footerLineOffset);
        };


        // Text adding function with page break logic
        const addTextToQuestionsPdf = (currentDoc: jsPDF, text: string | undefined | null, x: number, currentY: number, options?: any): number => {
            if (!text || !text.trim()) return currentY;
            const fontSize = options?.fontSize || 10;
            const fontStyle = options?.fontStyle || 'normal';
            const qLineHeight = fontSize * 1.2;
            const textMaxWidth = options?.maxWidth || maxLineWidth;
            
            currentDoc.setFontSize(fontSize);
            currentDoc.setFont('helvetica', fontStyle);
            const splitLines = currentDoc.splitTextToSize(text, textMaxWidth);
            let tempY = currentY;

            splitLines.forEach((line: string) => {
                if (tempY + qLineHeight > contentEndY ) { // Check against content end Y
                    addQuestionFooter(currentDoc, currentPageNumForQuestions, totalEstPagesForQuestions); // Add footer to current page
                    currentDoc.addPage();
                    currentPageNumForQuestions++;
                    totalEstPagesForQuestions = Math.max(totalEstPagesForQuestions, currentPageNumForQuestions); // Update estimate
                    tempY = addLogoAndQuestionHeader(currentDoc, margin); // Add header to new page
                    currentDoc.setFontSize(fontSize); 
                    currentDoc.setFont('helvetica', fontStyle);
                }
                currentDoc.text(line, x, tempY);
                tempY += qLineHeight;
            });
            return tempY + (fontSize * 0.15); // Small gap after block
        };

        yPos = addLogoAndQuestionHeader(doc, margin); 

        questionsToDownload.forEach((q, index) => {
            yPos = addTextToQuestionsPdf(doc, `${index + 1}. ${q.question || 'Missing Question Text'}`, margin, yPos, { fontStyle: 'bold' });

            if (activeQuestionTab === 'multiple-choice' && q.options && q.options.length === 4) {
                q.options.forEach((opt) => {
                    const letter = getCorrectAnswerLetter(q.options!.indexOf(opt));
                    const cleanedOpt = typeof opt === 'string' ? opt.replace(/✓/g, '').trim() : opt;
                    yPos = addTextToQuestionsPdf(doc, `${letter}) ${cleanedOpt || 'Missing Option'}`, margin + 15, yPos, { maxWidth: maxLineWidth - 15 });
                });
            }
            yPos += 2; 
            
            let answerText = 'Answer: Not provided';
            if (activeQuestionTab !== 'multiple-choice' && q.answer) { answerText = `Answer: ${q.answer}`; }
            else if (activeQuestionTab === 'multiple-choice') { 
                let pdfCorrectLetter = null; if (typeof q.answer === 'string' && /^[A-D]$/i.test(q.answer) && typeof q.correctAnswerIndex === 'number') { pdfCorrectLetter = q.answer.toUpperCase(); } else if (q.options) { const derivedIndex = q.options.findIndex(o => typeof o === 'string' && o.includes('✓')); if (derivedIndex !== -1) { pdfCorrectLetter = getCorrectAnswerLetter(derivedIndex); } } if (pdfCorrectLetter) { answerText = `Correct Answer: ${pdfCorrectLetter}`; } else { answerText = `Correct Answer: Could not determine`; }
            }
            yPos = addTextToQuestionsPdf(doc, answerText, margin + 15, yPos, { fontStyle: 'italic', maxWidth: maxLineWidth - 15 });
            
            if (q.explanation) {
                yPos = addTextToQuestionsPdf(doc, `Explanation: ${q.explanation}`, margin + 15, yPos, { fontStyle: 'italic', maxWidth: maxLineWidth - 15 });
            }
            
            yPos += 8; 
            if (index < questionsToDownload.length - 1) {
                 // Check if adding a separator would push content beyond the limit for the next item
                if (yPos + 10 + 20 > contentEndY) { // 10 for separator, 20 for approx next item start
                    addQuestionFooter(doc, currentPageNumForQuestions, totalEstPagesForQuestions);
                    doc.addPage();
                    currentPageNumForQuestions++;
                    totalEstPagesForQuestions = Math.max(totalEstPagesForQuestions, currentPageNumForQuestions);
                    yPos = addLogoAndQuestionHeader(doc, margin);
                } else {
                    doc.setLineWidth(0.2);
                    doc.line(margin, yPos, pageWidth - margin, yPos);
                    yPos += 10;
                }
            }
        });
        
        // Add footer to the last page
        addQuestionFooter(doc, currentPageNumForQuestions, totalEstPagesForQuestions);
        
        // Now, go back and update total pages in all footers
        for (let i = 1; i <= totalEstPagesForQuestions; i++) {
            doc.setPage(i);
            addQuestionFooter(doc, i, totalEstPagesForQuestions);
        }


        const pageRangeString = (typeof startPage === 'number' && typeof endPage === 'number' && startPage > 0 && endPage > 0) ? `_p${startPage}-${endPage}` : '';
        const filename = `${subject.replace(/ /g, '_') || 'Questions'}_Grade${grade || 'N_A'}${pageRangeString}_${activeQuestionTab}_Questions.pdf`;
        doc.save(filename);
        toast({ title: "Download Started", description: `Downloading ${filename}`});
    } catch(error) { console.error("Error generating Questions PDF:", error); toast({ title: "PDF Error", description: "Could not generate Questions PDF. Check console.", variant: "destructive"}); }
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
              title="Download Notes as Visual PDF (Text not selectable)"
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
                          <div className="my-4 overflow-x-auto rounded-md border dark:border-slate-600">
                            <table {...props} className="w-full" />
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

        {/* Questions Card (structure remains same, logic updated for pagination) */}
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
