"use client";

import {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {generateStudyQuestions} from "@/ai/flows/generate-study-questions";
import {generateNotes} from "@/ai/flows/generate-notes";
import {useToast} from "@/hooks/use-toast";
import {ScrollArea} from "@/components/ui/scroll-area";
import React from "react";

interface DashboardProps {
  chapterContent: string;
  subject: string; // Add subject prop
  grade: string; // Add grade prop
}

type QuestionType = {
  question: string;
  answer?: string;
  options?: string[];
  correctAnswerIndex?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ chapterContent: initialChapterContent, subject, grade }) => {
  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionType[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [noteGenerationMessage, setNoteGenerationMessage] = useState<string | null>(null);
  const [questionGenerationMessage, setQuestionGenerationMessage] = useState<string | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  const {toast} = useToast();

  useEffect(() => {
    setChapterContent(initialChapterContent);
  }, [initialChapterContent]);

  const handleGenerateQuestions = async (questionType: "multiple-choice" | "short-answer" | "fill-in-the-blank" | "true-false") => {
    setQuestionGenerationMessage("Generating questions, please wait...");
    if (!subject) {
      toast({
        title: "Warning",
        description: "Please select a subject.",
        variant: "destructive",
      });
       setQuestionGenerationMessage(null);
      return;
    }

    if (!chapterContent) {
      toast({
        title: "Warning",
        description: "No chapter content available. Please select a chapter.",
        variant: "destructive",
      });
      setQuestionGenerationMessage(null);
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      const result = await generateStudyQuestions({
        chapterContent: chapterContent,
        questionType,
        numberOfQuestions: 10,
      });

      setGeneratedQuestions(result.questions);
    } finally {
      setIsGeneratingQuestions(false);
       setQuestionGenerationMessage(null);
    }
  };


  const handleGenerateNotes = async () => {
     setNoteGenerationMessage("Generating notes, please wait...");
    if (!subject) {
      toast({
        title: "Warning",
        description: "Please select a subject.",
         variant: "destructive",
      });
       setNoteGenerationMessage(null);
      return;
    }

    if (!chapterContent) {
      toast({
        title: "Warning",
        description: "No chapter content available. Please select a chapter.",
         variant: "destructive",
      });
       setNoteGenerationMessage(null);
      return;
    }

    setIsGeneratingNotes(true);
    try {
      const result = await generateNotes({
        textbookChapter: chapterContent,
        gradeLevel: `${grade}th Grade`, // Use the grade prop
        subject: subject,
      });

      setGeneratedNotes(result.notes);
    } finally {
      setIsGeneratingNotes(false);
       setNoteGenerationMessage(null);
    }
  };

    const renderQuestionContent = (question: QuestionType, index: number) => {
        if (question.options && question.options.length > 0) {
            return (
                <div>
                    <ul>
                        {question.options.map((choice, choiceIndex) => (
                            <li key={choiceIndex} className="ml-4">
                                {String.fromCharCode(65 + choiceIndex)}: {choice}
                            </li>
                        ))}
                    </ul>
                   {question.answer && (
                        <p className="mt-2">
                            <strong>Correct Answer:</strong> {question.answer}
                        </p>
                    )}
                </div>
            );
        } else {
            return (
                 <div>
                    {question.answer && (
                        <p><strong>Answer:</strong> {question.answer}</p>
                    )}
                </div>
            );
        }
    };


  return (
    <div className="container mx-auto p-4">


        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
             <Button onClick={handleGenerateNotes} disabled={isGeneratingNotes || !!noteGenerationMessage}>
               {noteGenerationMessage || (isGeneratingNotes ? "Generating Notes..." : "Generate Notes")}
            </Button>
             <Button onClick={() => handleGenerateQuestions("multiple-choice")} disabled={isGeneratingQuestions || !!questionGenerationMessage}>
               {questionGenerationMessage || (isGeneratingQuestions ? "Generating MCQs..." : "Generate MCQs")}
            </Button>
             <Button onClick={() => handleGenerateQuestions("short-answer")} disabled={isGeneratingQuestions || !!questionGenerationMessage}>
              {questionGenerationMessage || (isGeneratingQuestions ? "Generating Short Answer Questions..." : "Generate Short Answer Questions")}
            </Button>
             <Button onClick={() => handleGenerateQuestions("fill-in-the-blank")} disabled={isGeneratingQuestions || !!questionGenerationMessage}>
               {questionGenerationMessage || (isGeneratingQuestions ? "Generating Fill-in-the-Blanks..." : "Generate Fill-in-the-Blanks")}
            </Button>
             <Button onClick={() => handleGenerateQuestions("true-false")} disabled={isGeneratingQuestions || !!questionGenerationMessage}>
               {questionGenerationMessage || (isGeneratingQuestions ? "Generating True or False Questions..." : "Generate True or False Questions")}
            </Button>
          </CardContent>
        </Card>


      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Generated Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {noteGenerationMessage ? (
              <p>{noteGenerationMessage}</p>
            ) : generatedNotes ? (
              <ScrollArea className="h-[400px] w-full">
                <div className="prose dark:prose-invert p-4">
                   {generatedNotes.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                       return <h1 key={index} className="text-2xl font-bold text-primary my-4">{line.substring(2)}</h1>;
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index} className="text-xl font-semibold text-primary my-3">{line.substring(3)}</h2>;
                    } else if (line.startsWith('### ')) {
                       return <h3 key={index} className="text-lg font-medium text-primary my-2">{line.substring(4)}</h3>;
                    } else if (line.startsWith('* ') || line.startsWith('- ')) {
                      return <li key={index} className="ml-4 list-disc text-foreground/80">{line.substring(2)}</li>;
                    } else if (line.match(/^\d+\.\s/)) {
                       return <li key={index} className="ml-4 list-decimal text-foreground/80">{line.replace(/^\d+\.\s/, '')}</li>;
                    } else if (line.startsWith('`') && line.endsWith('`')) {
                       return <code key={index} className="bg-muted text-muted-foreground p-1 rounded">{line.slice(1, -1)}</code>;
                     } else if (line.startsWith('**') && line.endsWith('**')) {
                        return <strong key={index} className="font-bold">{line.slice(2, -2)}</strong>;
                    } else if (line.startsWith('*') && line.endsWith('*')) {
                       return <em key={index} className="italic">{line.slice(1, -1)}</em>;
                    } else {
                      return <p key={index} className="text-foreground/90 my-1">{line}</p>;
                    }
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p>No notes generated yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Generated Questions</CardTitle>
          </CardHeader>
          <CardContent>
             {questionGenerationMessage ? (
              <p>{questionGenerationMessage}</p>
            ) : generatedQuestions.length > 0 ? (
              <ScrollArea className="h-[400px] w-full">
                  <ul>
                    {generatedQuestions.map((question, index) => (
                      <li key={index} className="mb-4 border-b pb-2">
                        <p className="font-semibold">{index + 1}. {question.question}</p>
                         {renderQuestionContent(question, index)}
                       </li>
                    ))}
                  </ul>
              </ScrollArea>
            ) : (
              <p>No questions generated yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
    