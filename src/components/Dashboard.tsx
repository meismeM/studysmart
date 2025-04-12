"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateStudyQuestions } from "@/ai/flows/generate-study-questions";
import { generateNotes } from "@/ai/flows/generate-notes";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const grades = [
  "9th Grade",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
];

const subjects = [
  "Math",
  "Science",
  "English",
  "History",
  "Geography",
  "Computer Science",
];

const Dashboard = () => {
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedTextbookURL, setUploadedTextbookURL] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
      // Load textbooks from local storage on component mount
      const storedGrade = localStorage.getItem('selectedGrade') || '';
      const storedSubject = localStorage.getItem('selectedSubject') || '';
      const storedTextbookURL = localStorage.getItem('uploadedTextbookURL') || '';

      setGrade(storedGrade);
      setSubject(storedSubject);
      setUploadedTextbookURL(storedTextbookURL);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("grade", grade);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.textContent) {
            setChapterContent(responseData.textContent);
            setUploadedTextbookURL(`/textbooks/${grade}/${file.name}`);

            localStorage.setItem('uploadedTextbookURL', `/textbooks/${grade}/${file.name}`);
            localStorage.setItem('selectedGrade', grade);
            localStorage.setItem('selectedSubject', subject);
            toast({
              title: "Success",
              description: "File uploaded and text extracted successfully!",
            });
          } else {
            toast({
              title: "Warning",
              description: "File uploaded successfully, but no text content was extracted.",
            });
          }
        } else {
          toast({
            title: "Error",
            description: "File upload failed.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        toast({
          title: "Error",
          description: "Error uploading file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleGenerateQuestions = async (questionType: "multiple-choice" | "short-answer" | "fill-in-the-blank") => {
    if (!grade || !subject) {
      toast({
        title: "Warning",
        description: "Please select grade and subject.",
      });
      return;
    }

    if (!chapterContent) {
      toast({
        title: "Warning",
        description: "Please enter chapter content or upload a textbook.",
      });
      return;
    }

    const result = await generateStudyQuestions({
      chapterContent: chapterContent,
      questionType,
      numberOfQuestions: 5, // You can make this dynamic later
    });

    setGeneratedQuestions(result.questions);
  };

  const handleGenerateNotes = async () => {
    if (!grade || !subject) {
      toast({
        title: "Warning",
        description: "Please select grade and subject.",
      });
      return;
    }

    if (!chapterContent) {
      toast({
        title: "Warning",
        description: "Please enter chapter content or upload a textbook.",
      });
      return;
    }


    const result = await generateNotes({
      textbookChapter: chapterContent,
      gradeLevel: grade,
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
            <CardTitle>Textbook Content</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Select onValueChange={setGrade} defaultValue={grade}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <Label htmlFor="textbookUpload">Upload Textbook</Label>
                <Input
                  type="file"
                  id="textbookUpload"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileUpload}
                />
                {selectedFile && (
                  <p className="mt-2">Selected file: {selectedFile.name}</p>
                )}
                 {uploadedTextbookURL && (
                    <Button asChild variant="link">
                        <a href={uploadedTextbookURL} target="_blank" rel="noopener noreferrer">
                            View Uploaded Textbook
                        </a>
                    </Button>
                )}
              </div>
              <div>
                <Label htmlFor="chapterContent">Chapter Content</Label>
                <Textarea
                  id="chapterContent"
                  placeholder="Enter chapter content..."
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
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
