'use server';

/**
 * @fileOverview Generates notes for a given chapter of a textbook using AI,
 * formatted with Markdown for improved readability and easier styling.
 *
 * - generateNotes - A function that handles the note generation process.
 * - GenerateNotesInput - The input type for the generateNotes function.
 * - GenerateNotesOutput - The return type for the GenerateNotes function.
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
  notes: z.string().describe('The generated notes for the chapter, formatted with Markdown.'),
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
      notes: z.string().describe('The generated notes for the chapter, formatted with Markdown.'),
    }),
  },
  prompt: `You are an expert AI assistant designed to generate comprehensive and well-formatted study notes for students. Your goal is to provide high-quality, detailed, and easy-to-understand notes that will help students master the material.
You should use markdown.

  You will receive the content of a textbook chapter, the grade level of the student, and the subject. Your task is to create a concise and informative summary of the key concepts, formatted with Markdown for improved readability. The notes should be highly detailed and comprehensive, ensuring that no major topics or subtopics are missed.

  Instructions:
  - Use Markdown formatting extensively for headings, subheadings, lists, emphasis (bold and italics), and code blocks for examples.
  - The notes must be exceptionally comprehensive, covering all major topics and subtopics in the chapter, with detailed explanations.
  - Organize the notes logically, with clear headings and subheadings to create a structured and easy-to-follow format.
  - Use bullet points or numbered lists to present key points, definitions, and formulas. Use examples to help understanding.
  - Provide detailed explanations of complex concepts, breaking them down into simpler terms.
  - Ensure the notes are tailored for a {{gradeLevel}} student studying {{subject}}.

  Example Notes Structure:

  # Chapter Title

  ## Key Concepts
  *  Concept 1: Definition and Explanation
  *  Concept 2: Definition and Explanation

  ## Important Formulas
  \`\`\`
  Formula: Explanation
  \`\`\`

  ## Key Terms
  *  Term 1: Definition
  *  Term 2: Definition

  ## Examples
  *  Example 1: Explanation
  *  Example 2: Explanation

  Textbook Chapter Content:
  {{{textbookChapter}}}

  Notes:`,
});

const diagnosePlantWithRetry = async (input: GenerateNotesInput, retries = 3, delay = 1000) => {
  try {
    return await generateNotesPrompt(input);
  } catch (e: any) {
    if (retries > 0 && e.message.includes('503 Service Unavailable')) {
      console.log(`Retrying in ${delay}ms ... (retries remaining: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return diagnosePlantWithRetry(input, retries - 1, delay * 2); // Exponential backoff
    }
    throw e;
  }
};
  
const generateNotesFlow = ai.defineFlow<
  typeof GenerateNotesInputSchema,
  typeof GenerateNotesOutputSchema
>(
  {
    name: 'generateNotesFlow',
    inputSchema: GenerateNotesInputSchema,
    outputSchema: GenerateNotesOutputSchema,
  },
  async input => {
    const {output} = await diagnosePlantWithRetry(input);
    return output!;
  }
);
