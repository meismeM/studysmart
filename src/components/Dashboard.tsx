
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateStudyQuestions } from "@/ai/flows/generate-study-questions";
import { generateNotes } from "@/ai/flows/generate-notes";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [grade, setGrade] = useState("9th Grade"); // Default to Grade 9
  const [subject, setSubject] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
            alert("File uploaded and text extracted successfully!");
          } else {
            alert("File uploaded successfully, but no text content was extracted.");
          }
        } else {
          alert("File upload failed.");
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        alert("Error uploading file.");
      }
    }
  };

  const handleGenerateQuestions = async (questionType: "multiple-choice" | "short-answer" | "fill-in-the-blank") => {
    if (!grade || !subject) {
      alert("Please select grade and subject.");
      return;
    }

    let content = chapterContent;
    if (selectedFile) {
      //content will set to the one from the pdf
    } else if (!content) {
      alert("Please enter chapter content or upload a textbook.");
      return;
    }

    const result = await generateStudyQuestions({
      chapterContent: content,
      questionType,
      numberOfQuestions: 5, // You can make this dynamic later
    });

    setGeneratedQuestions(result.questions);
  };

  const handleGenerateNotes = async () => {
    if (!grade || !subject) {
      alert("Please select grade and subject.");
      return;
    }

    let content = chapterContent;
    if (selectedFile) {
          //content will set to the one from the pdf
    } else if (!content) {
      alert("Please enter chapter content or upload a textbook.");
      return;
    }


    const result = await generateNotes({
      textbookChapter: content,
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
              <Select onValueChange={setSubject}>
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
                  accept=".pdf,.txt,.docx" // Adjust accepted file types as needed
                  onChange={handleFileUpload}
                />
                {selectedFile && (
                  <p className="mt-2">Selected file: {selectedFile.name}</p>
                )}
              </div>
            {!selectedFile && (
              <div>
                <Label htmlFor="chapterContent">Chapter Content</Label>
                <Textarea
                  id="chapterContent"
                  placeholder="Enter chapter content..."
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                />
              </div>
            )}
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
