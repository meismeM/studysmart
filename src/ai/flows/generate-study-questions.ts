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

const QuestionTypes = z.enum(['multiple-choice', 'short-answer', 'fill-in-the-blank', 'true-false']);

const GenerateStudyQuestionsInputSchema = z.object({
  chapterContent: z.string().describe('The content of the textbook chapter.'),
  questionType: QuestionTypes.describe('The type of study questions to generate.'),
  numberOfQuestions: z.number().int().positive().default(5).describe('The number of questions to generate (default is 5).'),
});
export type GenerateStudyQuestionsInput = z.infer<
  typeof GenerateStudyQuestionsInputSchema
>;

const GenerateStudyQuestionsOutputSchema = z.object({
  questions: z.array(z.object({
    question: z.string().describe('The generated question.'),
    answer: z.string().optional().describe('The answer to the question (if applicable).'),
    explanation: z.string().optional().describe('A detailed explanation of the answer (if applicable).'),
    options: z.array(z.string()).optional().describe('The multiple-choice options (if applicable).'),
    correctAnswerIndex: z.number().optional().describe('The index of the correct answer in the options array (if applicable).'),
  })).describe('An array of generated study questions.'),
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
        z.enum(['multiple-choice', 'short-answer', 'fill-in-the-blank', 'true-false'])
          .describe('The type of study questions to generate.'),
      numberOfQuestions: z.number().int().positive()
        .default(5)
        .describe('The number of questions to generate (default is 5).'),
    }),
  },
  output: {
    schema: z.object({
      questions: z.array(z.object({
        question: z.string().describe('The generated question.'),
        answer: z.string().optional().describe('The answer to the question (if applicable).'),
        explanation: z.string().optional().describe('A detailed explanation of the answer (if applicable).'),
        options: z.array(z.string()).optional().describe('The multiple-choice options (if applicable).'),
        correctAnswerIndex: z.number().optional().describe('The index of the correct answer in the options array (if applicable).'),
      })).describe('An array of generated study questions.'),
    }),
  },
  prompt: `You are an expert educator creating study questions for students.

  Based on the provided chapter content, generate {{{numberOfQuestions}}} study questions. The type of questions should be: {{{questionType}}}.

  Chapter Content: {{{chapterContent}}}

  - Multiple-choice questions should include 4 answer choices, with only one correct answer. Provide the index of the correct answer. Provide a detailed explanation why the answer is correct, referencing the textbook content where possible.

  - Short answer questions should be open-ended and require students to demonstrate their understanding of the material. Provide a comprehensive answer and a detailed explanation if possible, referencing the textbook content where possible.

  - Fill-in-the-blank questions should have one or two blanks per sentence, with the missing words indicated by underscores. Provide the answer.

  - True or false questions should test comprehension of key facts. Provide the correct answer (true or false) and a short explanation, referencing the textbook content where possible.
  
  Ensure all explanations are thorough and easy for a student to understand.

  Output the questions in the following JSON format:
  \`\`\`json
  {
    "questions": [
      {
        "question": "Question text",
        "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
        "correctAnswerIndex": 3,
        "explanation": "Explanation of why this answer is correct."
      },
      {
        "question": "Question text",
        "answer": "The answer.",
        "explanation": "Explanation of the answer."
      },
      {
        "question": "Question with blank(s) indicated by underscores.",
        "answer": "The answer to fill in the blank."
      },
      {
        "question": "Question text",
        "answer": "true or false",
        "explanation": "Explanation of why this answer is true or false."
      }
    ]
  }
  \`\`\`
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
