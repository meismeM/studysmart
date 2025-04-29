"use client";

import React, {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {generateStudyQuestions} from "@/ai/flows/generate-study-questions";
import {generateNotes} from "@/ai/flows/generate-notes";
import {useToast} from "@/hooks/use-toast";
import {ScrollArea} from "@/components/ui/scroll-area";
import { Check, X, RotateCcw, Eye, EyeOff } from 'lucide-react'; // Import icons
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components

interface DashboardProps {
  chapterContent: string;
  subject: string;
  grade: string;
}

type QuestionType = {
  question: string;
  answer?: string;
  options?: string[];
  correctAnswerIndex?: number;
  explanation?: string;
};

const Dashboard: React.FC<DashboardProps> = ({ chapterContent: initialChapterContent, subject, grade }) => {
  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<string, QuestionType[]>>({}); // Store questions by type
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<Record<string, boolean>>({}); // Track loading state per type
  const [noteGenerationMessage, setNoteGenerationMessage] = useState<string | null>(null);
  const [questionGenerationMessage, setQuestionGenerationMessage] = useState<Record<string, string | null>>({}); // Track messages per type
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // MCQ specific state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({}); // Store selected answer index for each MCQ
  const [isSubmitted, setIsSubmitted] = useState<Record<number, boolean>>({}); // Track submission status for each MCQ
  const [isMcqCorrect, setIsMcqCorrect] = useState<Record<number, boolean | null>>({}); // Track correctness for each MCQ

  // Short Answer / Fill-in-the-blank / True-False specific state
  const [showAnswer, setShowAnswer] = useState<Record<string, Record<number, boolean>>>({}); // Track visibility per type and index


  const {toast} = useToast();

  useEffect(() => {
    setChapterContent(initialChapterContent);
    setGeneratedQuestions({}); // Clear questions when content changes
    setGeneratedNotes(""); // Clear notes when content changes
    setSelectedAnswers({});
    setIsSubmitted({});
    setIsMcqCorrect({});
    setShowAnswer({});
  }, [initialChapterContent, subject, grade]); // Depend on subject and grade as well

  const getCorrectAnswerLetter = (index?: number): string | null => {
    if (index === undefined || index < 0 || index > 3) {
      return null; // Or handle invalid index appropriately
    }
    return String.fromCharCode(65 + index);
  };


  const handleGenerateQuestions = async (questionType: "multiple-choice" | "short-answer" | "fill-in-the-blank" | "true-false") => {
    setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: `Generating ${questionType.replace('-', ' ')} questions, please wait...` }));
    setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: true }));

    if (!subject || !grade) {
      toast({
        title: "Warning",
        description: "Please select a grade and subject first.",
        variant: "destructive",
      });
       setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: null }));
       setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: false }));
      return;
    }

    if (!chapterContent) {
      toast({
        title: "Warning",
        description: "No chapter content available. Please select a chapter.",
        variant: "destructive",
      });
       setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: null }));
       setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: false }));
      return;
    }

    try {
      const result = await generateStudyQuestions({
        chapterContent: chapterContent,
        questionType,
        numberOfQuestions: 10, // Generate 10 questions
      });

      setGeneratedQuestions(prev => ({ ...prev, [questionType]: result.questions }));
      // Reset state for the specific question type being generated
      if (questionType === 'multiple-choice') {
        setSelectedAnswers({});
        setIsSubmitted({});
        setIsMcqCorrect({});
      } else {
        setShowAnswer(prev => ({ ...prev, [questionType]: {} }));
      }

    } catch (error: any) {
         console.error(`Error generating ${questionType} questions:`, error);
         toast({
             title: "Error",
             description: `Failed to generate ${questionType.replace('-', ' ')} questions. ${error.message || 'Please try again later.'}`,
             variant: "destructive",
           });
     }
     finally {
      setIsGeneratingQuestions(prev => ({ ...prev, [questionType]: false }));
      setQuestionGenerationMessage(prev => ({ ...prev, [questionType]: null }));
    }
  };


  const handleGenerateNotes = async () => {
     setNoteGenerationMessage("Generating notes, please wait...");
     setIsGeneratingNotes(true);

     if (!subject || !grade) {
        toast({
          title: "Warning",
          description: "Please select a grade and subject first.",
           variant: "destructive",
        });
         setNoteGenerationMessage(null);
         setIsGeneratingNotes(false);
        return;
      }

    if (!chapterContent) {
      toast({
        title: "Warning",
        description: "No chapter content available. Please select a chapter.",
         variant: "destructive",
      });
       setNoteGenerationMessage(null);
       setIsGeneratingNotes(false);
      return;
    }


    try {
      const result = await generateNotes({
        textbookChapter: chapterContent,
        gradeLevel: `${grade}th Grade`, // Use the grade prop
        subject: subject, // Use the subject prop
      });

      setGeneratedNotes(result.notes);
    } catch (error: any) {
        console.error("Error generating notes:", error);
        toast({
            title: "Error",
            description: `Failed to generate notes. ${error.message || 'Please try again.'}`,
            variant: "destructive",
        });
    }
    finally {
      setIsGeneratingNotes(false);
      setNoteGenerationMessage(null);
    }
  };

  // --- MCQ Specific Handlers ---
  const handleMcqAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleMcqSubmit = (question: QuestionType, index: number) => {
    setIsSubmitted(prev => ({ ...prev, [index]: true }));

    if (question.options && question.correctAnswerIndex !== undefined) {
      const correctAnswer = getCorrectAnswerLetter(question.correctAnswerIndex);
      // Check if the selected answer's letter matches the correct answer letter
      setIsMcqCorrect(prev => ({ ...prev, [index]: getCorrectAnswerLetter(selectedAnswers[index]) === correctAnswer }));
    } else {
      setIsMcqCorrect(prev => ({ ...prev, [index]: null })); // Handle case where answer isn't available
    }
  };


  const handleMcqTryAgain = (index: number) => {
     setSelectedAnswers(prev => ({ ...prev, [index]: null }));
     setIsSubmitted(prev => ({ ...prev, [index]: false }));
     setIsMcqCorrect(prev => ({ ...prev, [index]: null }));
  };

   // --- Other Question Type Handlers ---
   const toggleShowAnswer = (questionType: string, index: number) => {
    setShowAnswer(prev => ({
      ...prev,
      [questionType]: {
        ...prev[questionType],
        [index]: !prev[questionType]?.[index] // Toggle the visibility
      }
    }));
  };


  // --- Rendering Logic ---

  const renderMarkdown = (markdown: string) => {
    if (!markdown) return null;

    const lines = markdown.split('\n');
    const elements = lines.map((line, index) => {
       // Headings
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-primary my-4">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-primary my-3">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium text-primary my-2">{line.substring(4)}</h3>;
      }
      // Bold and Italics (handle potential nesting or combined)
      // Use careful regex to avoid unintended matching across lines or formats
      // Bold needs to be handled carefully if asterisks are used for lists too
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
      line = line.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>'); // Italics (single asterisks, not double)


       // Bullet points (simple list for now)
       if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        // Ensure bold/italics inside list items are rendered
        const itemContent = line.replace(/^[\*\-]\s*/, '');
        return <li key={index} className="ml-6 list-disc text-foreground/80" dangerouslySetInnerHTML={{ __html: itemContent }}></li>;
      }
       // Numbered lists (simple list for now)
       if (line.match(/^\d+\.\s/)) {
         // Ensure bold/italics inside list items are rendered
        const itemContent = line.replace(/^\d+\.\s/, '');
        return <li key={index} className="ml-6 list-decimal text-foreground/80" dangerouslySetInnerHTML={{ __html: itemContent }}></li>;
      }
      // Code blocks (inline)
      line = line.replace(/`(.*?)`/g, '<code class="bg-muted text-muted-foreground p-1 rounded font-mono text-sm">$1</code>');

      // Horizontal Rule
      if (line.trim() === '---') {
        return <hr key={index} className="my-4 border-border" />;
      }

      // Paragraphs (handle empty lines correctly)
      if (line.trim() === '') {
        return <div key={index} className="h-2"></div>; // Add space for empty lines
      }

      // Use dangerouslySetInnerHTML for combined formatting, sanitize if needed in production
      return <p key={index} className="text-foreground/90 my-1" dangerouslySetInnerHTML={{ __html: line }} />;
    });

    // Wrap list items in appropriate tags if needed
    let listType: 'ul' | 'ol' | null = null;
    const groupedElements = [];
    let currentList: React.ReactNode[] = [];

    elements.forEach((el, i) => {
        if (React.isValidElement(el) && el.type === 'li') {
            const isDisc = el.props.className?.includes('list-disc'); // Check if it's a bullet point
            const isDecimal = el.props.className?.includes('list-decimal'); // Check if it's numbered
            const newListType = isDisc ? 'ul' : (isDecimal ? 'ol' : null);

            if (newListType === null) { // Should not happen if className is set correctly
                 if (listType !== null) { // End previous list if any
                    groupedElements.push(React.createElement(listType, { key: `list-${i-currentList.length}`, className:"my-2" }, currentList));
                    listType = null;
                    currentList = [];
                }
                 groupedElements.push(el); // Add the element directly if type is unknown
                 return;
             }


            if (listType === null) { // Starting a new list
                listType = newListType;
                currentList.push(el);
            } else if (listType === newListType) { // Continuing the same type of list
                currentList.push(el);
            } else { // Switching list type
                // Close previous list
                groupedElements.push(React.createElement(listType, { key: `list-${i-currentList.length}`, className:"my-2"}, currentList));
                 // Start new list
                listType = newListType;
                currentList = [el];
            }
        } else { // Not a list item
            if (listType !== null) { // If we were in a list, close it
                 groupedElements.push(React.createElement(listType, { key: `list-${i-currentList.length}`, className:"my-2" }, currentList));
                listType = null;
                currentList = [];
            }
            groupedElements.push(el); // Add the non-list element
        }
    });
     // Add any remaining list at the end
     if (listType !== null) {
        groupedElements.push(React.createElement(listType, { key: `list-final`, className:"my-2" }, currentList));
    }


    return groupedElements;
  };


 const renderQuestionContent = (questionType: string, question: QuestionType, index: number) => {
    const currentShowAnswer = showAnswer[questionType]?.[index] || false;
    const isMCQ = questionType === 'multiple-choice';
    const currentIsSubmitted = isMCQ && (isSubmitted[index] || false);
    const currentIsCorrect = isMCQ && (isMcqCorrect[index]);
    const correctAnswerLetter = isMCQ && question.correctAnswerIndex !== undefined ? getCorrectAnswerLetter(question.correctAnswerIndex) : 'N/A';


    if (isMCQ) {
      return (
        <div className="mt-2 space-y-2">
          {question.options?.map((choice, choiceIndex) => {
            const choiceLetter = getCorrectAnswerLetter(choiceIndex);
            const isSelected = selectedAnswers[index] === choiceIndex;
            const isCorrectChoice = choiceIndex === question.correctAnswerIndex;

            let buttonVariant: "secondary" | "default" | "destructive" | "outline" | "ghost" | "link" | null | undefined = "outline";
            let icon = null;

            if (currentIsSubmitted) {
              if (isSelected && isCorrectChoice) {
                buttonVariant = "default"; // Correctly selected
                icon = <Check className="text-green-500 ml-2" />;
              } else if (isSelected && !isCorrectChoice) {
                buttonVariant = "destructive"; // Incorrectly selected
                icon = <X className="text-red-500 ml-2" />;
              } else if (!isSelected && isCorrectChoice) {
                 buttonVariant = "secondary"; // The correct answer, not selected
                 icon = <Check className="text-green-500 ml-2 opacity-50" />; // Indicate correct but not selected
              }
            }


            return (
              <Button
                key={choiceIndex}
                variant={buttonVariant}
                onClick={() => !currentIsSubmitted && handleMcqAnswerSelect(index, choiceIndex)}
                disabled={currentIsSubmitted}
                className={`w-full justify-start text-left h-auto py-2 px-3 ${isSelected && !currentIsSubmitted ? 'ring-2 ring-primary' : ''}`}
              >
                <span className="font-semibold mr-2">{choiceLetter}:</span> {choice} {currentIsSubmitted && icon}
              </Button>
            );
          })}
          {!currentIsSubmitted ? (
            <Button
              onClick={() => handleMcqSubmit(question, index)}
              disabled={selectedAnswers[index] === null || selectedAnswers[index] === undefined}
              size="sm"
              className="mt-4"
            >
              Submit
            </Button>
          ) : (
            <div className="mt-4 flex flex-col items-start space-y-2">
               <p className={`font-semibold ${currentIsCorrect ? 'text-green-600' : 'text-red-600'}`}>
                 {currentIsCorrect ? 'Correct!' : `Incorrect. Correct answer: ${correctAnswerLetter}`}
               </p>
               {question.explanation && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Explanation:</strong> {question.explanation}
                  </p>
               )}
              <Button size="sm" variant="outline" onClick={() => handleMcqTryAgain(index)} className="mt-2">
                 <RotateCcw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>
          )}
        </div>
      );
    } else { // For Short Answer, Fill-in-the-blank, True/False
      return (
        <div className="mt-2">
          {question.answer && ( // Only show button if there's an answer
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toggleShowAnswer(questionType, index)}
              className="mb-2"
            >
               {currentShowAnswer ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {currentShowAnswer ? "Hide Answer" : "Show Answer"}
            </Button>
          )}
          {currentShowAnswer && (
            <div className="p-3 bg-muted rounded-md">
              <p><strong>Answer:</strong> {question.answer}</p>
              {question.explanation && (
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Explanation:</strong> {question.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-primary">StudySmart AI Dashboard</h1>

      {/* Action Buttons Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Study Aids</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           <Button onClick={handleGenerateNotes} disabled={isGeneratingNotes || !!noteGenerationMessage} className="w-full">
             {noteGenerationMessage || (isGeneratingNotes ? "Generating Notes..." : "Generate Notes")}
          </Button>
           <Button onClick={() => handleGenerateQuestions("multiple-choice")} disabled={isGeneratingQuestions['multiple-choice'] || !!questionGenerationMessage['multiple-choice']} className="w-full">
             {questionGenerationMessage['multiple-choice'] || (isGeneratingQuestions['multiple-choice'] ? "Generating MCQs..." : "Generate MCQs")}
          </Button>
           <Button onClick={() => handleGenerateQuestions("short-answer")} disabled={isGeneratingQuestions['short-answer'] || !!questionGenerationMessage['short-answer']} className="w-full">
            {questionGenerationMessage['short-answer'] || (isGeneratingQuestions['short-answer'] ? "Generating Short Answer..." : "Generate Short Answer")}
          </Button>
           <Button onClick={() => handleGenerateQuestions("fill-in-the-blank")} disabled={isGeneratingQuestions['fill-in-the-blank'] || !!questionGenerationMessage['fill-in-the-blank']} className="w-full">
             {questionGenerationMessage['fill-in-the-blank'] || (isGeneratingQuestions['fill-in-the-blank'] ? "Generating Fill-in-the-Blanks..." : "Generate Fill-in-the-Blanks")}
          </Button>
           <Button onClick={() => handleGenerateQuestions("true-false")} disabled={isGeneratingQuestions['true-false'] || !!questionGenerationMessage['true-false']} className="w-full">
             {questionGenerationMessage['true-false'] || (isGeneratingQuestions['true-false'] ? "Generating True/False..." : "Generate True/False")}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Notes Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generated Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {noteGenerationMessage ? (
            <p className="text-muted-foreground">{noteGenerationMessage}</p>
          ) : generatedNotes ? (
             <ScrollArea className="h-[600px] w-full border rounded-md p-4 bg-card"> {/* Increased height */}
              <div className="prose dark:prose-invert max-w-none"> {/* Apply prose for better markdown styling */}
                 {renderMarkdown(generatedNotes)}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground">Select a chapter and click "Generate Notes".</p>
          )}
        </CardContent>
      </Card>

      {/* Generated Questions Tabs */}
      <Tabs defaultValue="multiple-choice" className="w-full">
         <TabsList className="grid w-full grid-cols-4 mb-4">
           <TabsTrigger value="multiple-choice">MCQ</TabsTrigger>
           <TabsTrigger value="short-answer">Short Answer</TabsTrigger>
           <TabsTrigger value="fill-in-the-blank">Fill-in-the-Blank</TabsTrigger>
           <TabsTrigger value="true-false">True/False</TabsTrigger>
         </TabsList>

         {['multiple-choice', 'short-answer', 'fill-in-the-blank', 'true-false'].map((type) => (
           <TabsContent key={type} value={type}>
             <Card>
               <CardHeader>
                 <CardTitle>{type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Questions</CardTitle>
               </CardHeader>
               <CardContent>
                 {questionGenerationMessage[type] ? (
                   <p className="text-muted-foreground">{questionGenerationMessage[type]}</p>
                 ) : generatedQuestions[type] && generatedQuestions[type].length > 0 ? (
                   <ScrollArea className="h-[500px] w-full pr-4">
                     <ul className="space-y-6">
                       {generatedQuestions[type].map((question, index) => (
                         <li key={`${type}-${index}`} className="border rounded-lg p-4 shadow-sm bg-background">
                           <p className="font-medium mb-2">{index + 1}. {question.question}</p>
                           {renderQuestionContent(type, question, index)}
                         </li>
                       ))}
                     </ul>
                   </ScrollArea>
                 ) : (
                    <p className="text-muted-foreground">Click "Generate {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}" above.</p>
                 )}
               </CardContent>
             </Card>
           </TabsContent>
         ))}
       </Tabs>


    </div>
  );
};

export default Dashboard;
