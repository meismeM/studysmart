"use client";

import {useState, useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {generateStudyQuestions} from "@/ai/flows/generate-study-questions";
import {generateNotes} from "@/ai/flows/generate-notes";
import {useToast} from "@/hooks/use-toast";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {ScrollArea} from "@/components/ui/scroll-area";
import React from "react";

interface DashboardProps {
  chapterContent: string;
}

const Dashboard: React.FC<DashboardProps> = ({chapterContent: initialChapterContent}) => {
  const [subject, setSubject] = useState("");
  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState("");

  const {toast} = useToast();

  useEffect(() => {
    setChapterContent(initialChapterContent);
  }, [initialChapterContent]);

  const handleGenerateQuestions = async (questionType: "multiple-choice" | "short-answer" | "fill-in-the-blank") => {
    if (!subject) {
      toast({
        title: "Warning",
        description: "Please select a subject.",
      });
      return;
    }

    if (!chapterContent) {
      toast({
        title: "Warning",
        description: "No chapter content available. Please select a chapter.",
      });
      return;
    }

    const result = await generateStudyQuestions({
      chapterContent: chapterContent,
      questionType,
      numberOfQuestions: 5,
    });

    setGeneratedQuestions(result.questions);
  };

  const handleGenerateNotes = async () => {
    if (!subject) {
      toast({
        title: "Warning",
        description: "Please select a subject.",
      });
      return;
    }

    if (!chapterContent) {
      toast({
        title: "Warning",
        description: "No chapter content available. Please select a chapter.",
      });
      return;
    }

    const result = await generateNotes({
      textbookChapter: chapterContent,
      gradeLevel: "9th Grade",
      subject: subject,
    });

    setGeneratedNotes(result.notes);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">StudySmart AI Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Chapter Content</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select onValueChange={setSubject} defaultValue={subject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select subject"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="biology9" value="biology9">Biology</SelectItem>
                  <SelectItem key="chemistry9" value="chemistry9">Chemistry</SelectItem>
                  <SelectItem key="citizenship9" value="citizenship9">Citizenship</SelectItem>
                  <SelectItem key="economics9" value="economics9">Economics</SelectItem>
                  <SelectItem key="english9" value="english9">English</SelectItem>
                  <SelectItem key="geography9" value="geography9">Geography</SelectItem>
                  <SelectItem key="history9" value="history9">History</SelectItem>
                  <SelectItem key="physics9" value="physics9">Physics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="chapterContent">Selected Chapter Content</Label>
              <Textarea
                id="chapterContent"
                placeholder="Chapter content will appear here after selection..."
                value={chapterContent}
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button onClick={handleGenerateNotes}>Generate Notes</Button>
            <Button onClick={() => handleGenerateQuestions("multiple-choice")}>
              Generate MCQs
            </Button>
            <Button onClick={() => handleGenerateQuestions("short-answer")}>
              Generate Short Answer Questions
            </Button>
            <Button onClick={() => handleGenerateQuestions("fill-in-the-blank")}>
              Generate Fill-in-the-Blanks
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Generated Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedNotes ? (
              <ScrollArea className="h-[400px] w-full">
                <div className="whitespace-pre-line">
                  {generatedNotes.split('\n').map((line, index) => {
                    if (line.startsWith('#')) {
                      const level = line.indexOf(' ');
                      const tag = `h${level}`;
                      const content = line.substring(level + 1);
                      return React.createElement(tag, {key: index}, content);
                    } else if (line.startsWith('-')) {
                      return <li key={index}>{line.substring(1).trim()}</li>;
                    } else {
                      return <p key={index}>{line}</p>;
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
            <CardTitle>Generated MCQs</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedQuestions.length > 0 ? (
              <ul>
                {generatedQuestions.map((question, index) => {
                  const parts = question.split('\n');
                  const questionText = parts[0];
                  const choices = parts.slice(1);
                  return (
                    <li key={index} className="mb-2">
                      <p>{questionText}</p>
                      <RadioGroup>
                        {choices.map((choice, choiceIndex) => (
                          <div key={choiceIndex} className="ml-4">
                            <RadioGroupItem value={choice} id={`question-${index}-choice-${choiceIndex}`}/>
                            <Label htmlFor={`question-${index}-choice-${choiceIndex}`}>{choice}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No MCQs generated yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Generated Short Answer Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedQuestions.length > 0 ? (
              <ul>
                {generatedQuestions.map((question, index) => (
                  <li key={index} className="mb-2">
                    {question}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No Short Answer questions generated yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Generated Fill in the Blanks</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedQuestions.length > 0 ? (
              <ul>
                {generatedQuestions.map((question, index) => (
                  <li key={index} className="mb-2">
                    {question}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No Fill in the Blanks questions generated yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
