"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateStudyQuestions } from "@/ai/flows/generate-study-questions";
import { generateNotes } from "@/ai/flows/generate-notes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const subjects = [
  "Math",
  "Science",
  "English",
  "History",
  "Geography",
  "Computer Science",
];

interface DashboardProps {
  chapterContent: string;
}

const Dashboard: React.FC<DashboardProps> = ({ chapterContent: initialChapterContent }) => {
  const [subject, setSubject] = useState("");
  const [chapterContent, setChapterContent] = useState(initialChapterContent);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const { toast } = useToast();

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
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
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
        <Tabs defaultValue="notes" className="w-[400px]">
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="mcq">MCQs</TabsTrigger>
            <TabsTrigger value="shortAnswer">Short Answer</TabsTrigger>
            <TabsTrigger value="fillInTheBlanks">Fill in the Blanks</TabsTrigger>
          </TabsList>
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Generated Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedNotes ? (
                  <p>{generatedNotes}</p>
                ) : (
                  <p>No notes generated yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="mcq">
            <Card>
              <CardHeader>
                <CardTitle>Generated MCQs</CardTitle>
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
                  <p>No MCQs generated yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="shortAnswer">
            <Card>
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
          </TabsContent>
          <TabsContent value="fillInTheBlanks">
            <Card>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
