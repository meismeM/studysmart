'use server';

/**
 * @fileOverview Generates notes for a given chapter of a textbook using AI,
 * formatted with HTML for improved readability.
 *
 * - generateNotes - A function that handles the note generation process.
 * - GenerateNotesInput - The input type for the generateNotes function.
 * - GenerateNotesOutput - The return type for the generateNotes function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateNotesInputSchema = z.object({
  textbookChapter: z.string().describe('The content of the textbook chapter.'),
  gradeLevel: z.string().describe('The grade level of the student.'),
  subject: z.string().describe('The subject of the textbook chapter.'),
});
export type GenerateNotesInput = z.infer<typeof GenerateNotesInputSchema>;

const GenerateNotesOutputSchema = z.object({
  notes: z.string().describe('The generated notes for the chapter, formatted with HTML.'),
  progress: z.string().describe('Progress of the notes generation.'),
});
export type GenerateNotesOutput = z.infer<typeof GenerateNotesOutputSchema>;

export async function generateNotes(input: GenerateNotesInput): Promise<GenerateNotesOutput> {
  return generateNotesFlow(input);
}

const generateNotesPrompt = ai.definePrompt({
  name: 'generateNotesPrompt',
  input: {
    schema: z.object({
      textbookChapter: z.string().describe('The content of the textbook chapter.'),
      gradeLevel: z.string().describe('The grade level of the student.'),
      subject: z.string().describe('The subject of the textbook chapter.'),
    }),
  },
  output: {
    schema: z.object({
      notes: z.string().describe('The generated notes for the chapter, formatted with HTML.'),
      progress: z.string().describe('Progress of the notes generation.'),
    }),
  },
  prompt: `You are an expert AI assistant designed to generate comprehensive and well-formatted study notes for students.

  You will receive the content of a textbook chapter, the grade level of the student, and the subject. Your task is to create a concise and informative summary of the key concepts, formatted with HTML for improved readability.

  Instructions:
  - Use HTML formatting tags such as <h1>, <h2>, <p>, <ul>, and <li> to structure the notes.
  - Ensure the notes are comprehensive, covering all major topics and subtopics in the chapter.
  - Organize the notes logically, with clear headings and subheadings.
  - Use paragraphs for detailed information and lists for key points.
  - The notes should be tailored for a {{gradeLevel}} student studying {{subject}}.

  Textbook Chapter Content:
  {{{textbookChapter}}}

  Notes:`,
});

const generateNotesFlow = ai.defineFlow<
  typeof GenerateNotesInputSchema,
  typeof GenerateNotesOutputSchema
>({
  name: 'generateNotesFlow',
  inputSchema: GenerateNotesInputSchema,
  outputSchema: GenerateNotesOutputSchema,
}, async input => {
  const {output} = await generateNotesPrompt(input);
  return {
    ...output!,
    progress: 'Generated a summary of the key concepts in note form, formatted with HTML.',
  };
});
