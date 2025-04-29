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
  numberOfQuestions: z.number().int().positive().default(10).describe('The number of questions to generate (default is 10).'),
});
export type GenerateStudyQuestionsInput = z.infer<
  typeof GenerateStudyQuestionsInputSchema
>;

const GenerateStudyQuestionsOutputSchema = z.object({
  questions: z.array(z.object({
    question: z.string().describe('The generated question.'),
    answer: z.string().optional().describe('The answer to the question. For MCQs, this should be the letter corresponding to the correct option (e.g., "B"). For True/False, it should be "true" or "false". For Fill-in-the-blank, it should be the missing word(s).'),
    explanation: z.string().optional().describe('A detailed explanation of the answer (if applicable).'),
    options: z.array(z.string()).optional().describe('The multiple-choice options (e.g., ["Choice A", "Choice B", "Choice C", "Choice D"]).'),
    correctAnswerIndex: z.number().optional().describe('The index (0-based) of the correct answer in the options array (if applicable).'),
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
        .default(10)
        .describe('The number of questions to generate (default is 10).'),
    }),
  },
  output: {
    schema: z.object({
      questions: z.array(z.object({
        question: z.string().describe('The generated question.'),
        answer: z.string().optional().describe('The answer to the question. For MCQs, this should be the letter corresponding to the correct option (e.g., "B"). For True/False, it should be "true" or "false". For Fill-in-the-blank, it should be the missing word(s).'),
        explanation: z.string().optional().describe('A detailed explanation of the answer (if applicable).'),
        options: z.array(z.string()).optional().describe('The multiple-choice options (e.g., ["Choice A", "Choice B", "Choice C", "Choice D"]).'),
        correctAnswerIndex: z.number().optional().describe('The index (0-based) of the correct answer in the options array (if applicable).'),
      })).describe('An array of generated study questions.'),
    }),
  },
  prompt: `You are an expert educator creating study questions for students.

  Based on the provided chapter content, generate exactly {{{numberOfQuestions}}} study questions. The type of questions should be: {{{questionType}}}.

  Chapter Content: {{{chapterContent}}}

  - **Multiple-choice questions:** Include exactly 4 distinct answer choices, with only one correct answer. Provide the index (0-based) of the correct answer in the 'correctAnswerIndex' field. Also provide the correct answer letter (A, B, C, or D) in the 'answer' field. Provide a concise explanation.
  - **Short answer questions:** Should be open-ended and require students to demonstrate their understanding. Provide a comprehensive answer.
  - **Fill-in-the-blank questions:** Should have one or two blanks per sentence, indicated by underscores (__). Provide the missing word(s) in the 'answer' field.
  - **True/False questions:** Test comprehension of key facts. Provide the correct answer (lowercase 'true' or 'false') in the 'answer' field. Provide a brief explanation.

  Ensure all answers are accurate based on the provided chapter content.

  Output the questions ONLY in the following JSON format:
  \`\`\`json
  {
    "questions": [
      {
        "question": "Question text for MCQ?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": "B", // The letter corresponding to the correct option
        "correctAnswerIndex": 1, // The 0-based index of the correct option
        "explanation": "Brief explanation..." // Optional but helpful
      },
      {
        "question": "Short answer question text?",
        "answer": "The detailed answer.",
        "explanation": "Optional explanation..."
      },
      {
        "question": "This sentence has a __ to fill in.",
        "answer": "blank"
      },
      {
        "question": "True or False: Statement?",
        "answer": "true", // or "false"
        "explanation": "Brief justification..." // Optional but helpful
      }
      // ... more questions up to numberOfQuestions
    ]
  }
  \`\`\`
  `,
});


// Helper function with retry logic
const generateStudyQuestionsWithRetry = async (input: GenerateStudyQuestionsInput, retries = 3, delay = 1000): Promise<{ output: GenerateStudyQuestionsOutput | null }> => {
  try {
    // Directly await the prompt execution here
    const result = await prompt(input);
    return result; // Return the whole result object which includes 'output'
  } catch (e: any) {
    // Check if the error message exists and includes the 503 or 429 status, and if retries are left
    if (retries > 0 && e.message && (e.message.includes('503 Service Unavailable') || e.message.includes('The model is overloaded') || e.message.includes('429 Too Many Requests'))) {
      console.warn(`Retrying generateStudyQuestionsPrompt in ${delay}ms due to 503/429 error... (retries remaining: ${retries})`);
      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delay));
      // Recursive call with decremented retries and increased delay (exponential backoff)
      return generateStudyQuestionsWithRetry(input, retries - 1, delay * 2);
    }
    // If it's not a 503/429 error or retries are exhausted, re-throw the error
    console.error("Error generating study questions:", e); // Log the error for debugging
    throw e; // Re-throw the original error or a new error indicating failure after retries
  }
};


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
    const result = await generateStudyQuestionsWithRetry(input);
     if (!result || !result.output) {
       // Handle the case where retries failed and output is null
       throw new Error("Failed to generate study questions after multiple retries.");
     }
     return result.output;
  }
);
