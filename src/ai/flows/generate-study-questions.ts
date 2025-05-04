// src/ai/flows/generate-study-questions.ts

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
export type QuestionTypeValue = z.infer<typeof QuestionTypes>; // Export Type

// *** Schema includes gradeLevel and subject ***
const GenerateStudyQuestionsInputSchema = z.object({
  chapterContent: z.string().min(20).describe('The chapter text.'),
  questionType: QuestionTypes.describe('The question type.'),
  numberOfQuestions: z.number().int().min(5).positive().max(30).default(10).describe('Number of questions (5-30).'),
  gradeLevel: z.string().describe('The grade level of the student (e.g., 9th Grade).'),
  subject: z.string().describe('The subject of the textbook chapter (e.g., Biology).'),
});
export type GenerateStudyQuestionsInput = z.infer<typeof GenerateStudyQuestionsInputSchema>; // Export Type

// Output schema defines the structure of the expected JSON response
const GenerateStudyQuestionsOutputSchema = z.object({
  questions: z.array(z.object({
    question: z.string().min(5).describe('Question text.'),
    answer: z.string().optional().describe('Answer (Format: A-D for MCQ, true/false for TF, text for others).'),
    explanation: z.string().optional().describe('Explanation (Required for MCQ & True/False).'),
    options: z.array(z.string().min(1)).length(4).optional().describe('Options array (Required for MCQ, must have 4 items).'),
    correctAnswerIndex: z.number().int().min(0).max(3).optional().describe('0-based index (Required for MCQ).'),
  })).min(1).describe('List of generated questions (at least 1).'), // Ensure at least 1 question if successful
});
export type GenerateStudyQuestionsOutput = z.infer<typeof GenerateStudyQuestionsOutputSchema>; // Export Type


// --- Exported Function ---
// This function is called from the frontend (Dashboard)
export async function generateStudyQuestions(
  input: GenerateStudyQuestionsInput
): Promise<GenerateStudyQuestionsOutput> {
   // Validate the input against the Zod schema before proceeding
   console.log(`[Questions Entry] Req: ${input.numberOfQuestions} ${input.questionType} for Grade ${input.gradeLevel} ${input.subject}. Validating...`);
   try {
       GenerateStudyQuestionsInputSchema.parse(input);
    } catch (validationError: any) {
       console.error("[Questions Export Fn] Invalid input:", validationError.errors);
       // Create a user-friendly error message from Zod errors
       const msg = validationError.errors.map((e:any) => `${e.path.join('.')||'Input'}: ${e.message}`).join('; ');
       throw new Error(`Invalid input - ${msg}`);
    }
   // If validation passes, call the internal Genkit flow
   return generateStudyQuestionsFlow(input);
}


// --- Internal AI Prompt Definition ---
// Defines the instructions and structure for the AI model
const prompt = ai.definePrompt({
  name: 'generateStudyQuestionsPromptV4.1', // Versioning helps track changes
  input: { schema: GenerateStudyQuestionsInputSchema }, // Link to the input schema
  output: { schema: GenerateStudyQuestionsOutputSchema }, // Link to the output schema for validation/parsing
  // The detailed prompt guiding the AI
  prompt: `Generate exactly {{{numberOfQuestions}}} questions of type '{{{questionType}}}'.
  The questions should be appropriate for a **{{{gradeLevel}}} student studying {{subject}}**, ranging from basic recall to advanced application based ONLY on the text below.
  Follow ALL formatting rules STRICTLY. Output ONLY valid JSON conforming precisely to the specified output schema.

  Content:
  \\\`\\\`\\\`text
  {{{chapterContent}}}
  \\\`\\\`\\\`

  --- REQUIREMENTS & FORMAT ---
  Output Format MUST be a single JSON object: { "questions": [ { /* question object */ }, ... ] }

  **Structure for EACH object inside the "questions" array:**
  1.  'question' (string): ALWAYS REQUIRED. Contains the question text. Min length 5 chars.
  2.  Based ONLY on the requested type '{{{questionType}}}', include the following fields STRICTLY:
      *   'multiple-choice': MANDATORY fields: 'options' (Array 4 strings, one ending with ✓), 'answer' (String A-D matching ✓), 'correctAnswerIndex' (Number 0-3 matching ✓), 'explanation' (String, non-empty).
      *   'short-answer': MANDATORY 'answer' (String, non-empty). OPTIONAL 'explanation' (String). NO 'options' or 'correctAnswerIndex'.
      *   'fill-in-the-blank': 'question' MUST contain '___'. MANDATORY 'answer' (String, the blank content). NO 'options', 'correctAnswerIndex', 'explanation'.
      *   'true-false': MANDATORY 'answer' ('true'/'false'). MANDATORY 'explanation' (String, non-empty). NO 'options' or 'correctAnswerIndex'.

  --- DETAILED JSON EXAMPLE (Adapt fields based on requested type '{{{questionType}}}') ---
  \\\`\\\`\\\`json
  {
    "questions": [
      // MCQ Example
      { "question": "Which part of the cell is responsible for generating ATP through respiration?", "options": ["Nucleus", "Ribosome", "Mitochondrion ✓", "Chloroplast"], "answer": "C", "correctAnswerIndex": 2, "explanation": "Mitochondria are known as the powerhouses..." },
      // TF Example
      { "question": "The cell membrane is freely permeable...", "answer": "false", "explanation": "The cell membrane is selectively permeable..." },
       // FIB Example
      { "question": "Proteins are synthesized by organelles called ___.", "answer": "ribosomes" },
       // SA Example
      { "question": "What is the main function of the Golgi apparatus?", "answer": "The Golgi apparatus modifies...", "explanation": "It acts like the cell's post office..." }
      // ... continue for {{{numberOfQuestions}}} total objects ...
    ]
  }
  \\\`\\\`\\\`
  **CRITICAL:** Validate your final JSON structure meticulously. Ensure the root is \`{ "questions": [...] }\`. Ensure all mandatory fields for '{{{questionType}}}' are present and correct in *every* question object (especially answer/index/✓ match for MCQ). Output only the JSON object.
  `,
});


// --- Internal Retry Logic ---
// --- Internal Retry Logic ---
// Handles transient API errors (like rate limits, server overload)
const generateStudyQuestionsWithRetry = async (input: GenerateStudyQuestionsInput, retries = 3, delay = 1000): Promise<{ output: GenerateStudyQuestionsOutput | null }> => {
  console.log(`[Questions Retry] Prompting for ${input.questionType}... (${retries} retries left)`);
  try {
    const result = await prompt(input); // Execute the AI prompt
    const qCount = result?.output?.questions?.length ?? 0;
    console.log(`[Questions Retry] Success. Received ${qCount} questions.`);

    // Warn if AI returns 0 questions when more were expected
    if (qCount === 0 && input.numberOfQuestions > 0) {
      console.warn("[Questions Retry] AI returned 0 questions despite requesting > 0.");
      // NOTE: Consider throwing an error here if 0 questions is unacceptable
      // throw new Error("AI returned 0 questions when >0 were requested.");
    }
    // Basic check for the existence and type of the questions array
    if (result?.output?.questions === undefined || !Array.isArray(result.output.questions)) {
      console.error("[Questions Retry] Invalid response structure: 'questions' array missing or not an array.");
      throw new Error("AI response did not contain a valid 'questions' array.");
    }
    return result; // Return the successful result (including the output)

  } catch (e: any) {
    console.warn(`[Questions Retry] Failed on attempt ${4 - retries}: ${e.message}`);
    // Check if the error is retryable and retries are left
    const shouldRetry = retries > 0 && e.message && (
        e.message.includes('503') || // Service Unavailable
        e.message.includes('429') || // Rate limit / Too Many Requests
        e.message.toLowerCase().includes('overloaded') ||
        e.message.toLowerCase().includes('rate limit') ||
        e.message.toLowerCase().includes('empty output') || // Retry if error indicates empty output
        e.message.toLowerCase().includes('timed out') ||
        e.message.toLowerCase().includes('invalid json') || // Retry if AI gives bad JSON
        e.message.toLowerCase().includes('failed to parse') // Retry on parsing errors
       );

    if (shouldRetry)
    {
      // Exponential backoff calculation
      const retryDelay = delay * Math.pow(2, 3 - retries);
      console.warn(`[Questions Retry] Retrying in ${retryDelay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      // Recursive call with decremented retries and increased delay
      return generateStudyQuestionsWithRetry(input, retries - 1, retryDelay);
    }

    // If error is not retryable or retries exhausted
    console.error("[Questions Retry] Final failure after retries:", e);
    // Create a more user-friendly error message
    let userErrorMessage = `Failed to generate questions: ${e.message || 'Unknown AI error'}.`;
    if (e.message?.toLowerCase().includes('invalid json') || e.message?.toLowerCase().includes('failed to parse')) {
      userErrorMessage = 'AI response format was invalid. Could not process questions.';
    } else if (e.message?.toLowerCase().includes('content filter')) {
      userErrorMessage = 'Question generation failed due to content filtering.';
    } else if (e.message?.toLowerCase().includes('empty output')){
        userErrorMessage = 'AI failed to generate questions content (empty response).';
    }
    // Re-throw the error to be caught by the caller
    throw new Error(userErrorMessage);
  }
};


// --- Internal Genkit Flow Definition ---
// Wraps the AI call and retry logic into a Genkit flow
const generateStudyQuestionsFlow = ai.defineFlow<
  typeof GenerateStudyQuestionsInputSchema, // Input type defined by Zod schema
  typeof GenerateStudyQuestionsOutputSchema // Output type defined by Zod schema
>(
  {
    name: 'generateStudyQuestionsFlow', // Name for tracing/logging
    inputSchema: GenerateStudyQuestionsInputSchema,
    outputSchema: GenerateStudyQuestionsOutputSchema,
  },
  async input => { // The actual logic executed by the flow
    console.log(`[Questions Flow] Starting: ${input.questionType}, num: ${input.numberOfQuestions}, Grade: ${input.gradeLevel}, Subject: ${input.subject}`);
    const result = await generateStudyQuestionsWithRetry(input); // Call the retry logic

    // Final check after retries - ensure output and questions exist
    // The Zod outputSchema validation by Genkit also helps here
    if (!result?.output?.questions || (input.numberOfQuestions > 0 && result.output.questions.length === 0)) {
       console.error("[Questions Flow] Failed: No valid questions array returned after retries.");
       // If this error is thrown, the function implicitly stops returning anything, satisfying TS void return possibility
       throw new Error("AI failed to generate questions after multiple attempts.");
    }

    console.log(`[Questions Flow] Success (${result.output.questions.length} Qs received). Output schema validation passed by Genkit.`);

    // ** Return only the '.output' part of the result object **
    // This matches the declared outputSchema type for the flow.
    return result.output;
  }
);

// --- END OF FILE ---