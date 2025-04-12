// src/ai/flows/generate-notes.ts
'use server';

/**
 * @fileOverview Generates notes for a given chapter of a textbook using AI.
 *
 * - generateNotes - A function that generates notes for a chapter.
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
  notes: z.string().describe('The generated notes for the chapter.'),
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
      notes: z.string().describe('The generated notes for the chapter.'),
      progress: z.string().describe('Progress of the notes generation.'),
    }),
  },
  prompt: `You are an AI assistant designed to generate study notes for students.

  Given the following textbook chapter content, generate a concise and informative summary of the key concepts.
  The notes should be tailored for a {{gradeLevel}} student studying {{subject}}.

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
    progress: 'Generated a summary of the key concepts in note form.',
  };
});