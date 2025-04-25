'use server';
/**
 * @fileOverview Generates study questions (multiple-choice, short answer, and fill-in-the-blank) for a given chapter of a textbook.
 *
 * - generateStudyQuestions - A function that generates study questions based on the chapter content and question type.
 * - GenerateStudyQuestionsInput - The input type for the generateStudyQuestions function.
 * - GenerateStudyQuestionsOutput - The return type for the generateStudyQuestions function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateStudyQuestionsInputSchema = z.object({
  chapterContent: z.string().describe('The content of the textbook chapter.'),
  questionType: z
    .enum(['multiple-choice', 'short-answer', 'fill-in-the-blank'])
    .describe('The type of study questions to generate.'),
  numberOfQuestions: z.number().int().positive().default(5).describe('The number of questions to generate (default is 5).'),
});
export type GenerateStudyQuestionsInput = z.infer<
  typeof GenerateStudyQuestionsInputSchema
>;

const GenerateStudyQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('An array of generated study questions.'),
});
export type GenerateStudyQuestionsOutput = z.infer<
  typeof GenerateStudyQuestionsOutputSchema
>;

export async function generateStudyQuestions(
  input: GenerateStudyQuestionsInput
): Promise<GenerateStudyQuestionsOutput> {
  return generateStudyQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudyQuestionsPrompt',
  input: {
    schema: z.object({
      chapterContent: z.string().describe('The content of the textbook chapter.'),
      questionType:
        z.enum(['multiple-choice', 'short-answer', 'fill-in-the-blank'])
          .describe('The type of study questions to generate.'),
      numberOfQuestions: z.number().int().positive()
        .default(5)
        .describe('The number of questions to generate (default is 5).'),
    }),
  },
  output: {
    schema: z.object({
      questions: z
        .array(z.string())
        .describe('An array of generated study questions.'),
    }),
  },
  prompt: `You are an expert educator creating study questions for students.

  Based on the provided chapter content, generate {{{numberOfQuestions}}} study questions. The type of questions should be: {{{questionType}}}.

  Chapter Content: {{{chapterContent}}}

  - Multiple-choice questions should include 4 answer choices, with only one correct answer. Enclose the correct answer with <correct>.
  - Short answer questions should be open-ended and require students to demonstrate their understanding of the material.
  - Fill-in-the-blank questions should have one or two blanks per sentence, with the missing words indicated by underscores.
  
  Output the questions in the following format. Each question must be in a new line.

  For Multiple choice questions:
  1. Question text
  a) Choice 1
  b) Choice 2
  c) Choice 3
  d) Choice 4 <correct>

  For Short answer questions:
  1. Question text

  For Fill-in-the-blank questions:
  1. Question with blank(s) indicated by underscores.
  `,
});

const generateStudyQuestionsFlow = ai.defineFlow<
  typeof GenerateStudyQuestionsInputSchema,
  typeof GenerateStudyQuestionsOutputSchema
>(
  {
    name: 'generateStudyQuestionsFlow',
    inputSchema: GenerateStudyQuestionsInputSchema,
    outputSchema: GenerateStudyQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
