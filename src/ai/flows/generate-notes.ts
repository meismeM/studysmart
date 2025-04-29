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
  You should use markdown extensively to format the notes clearly, making them easy to read and style on a webpage.

  You will receive the content of a textbook chapter, the grade level of the student, and the subject. Your task is to create a detailed and informative summary of the key concepts, formatted with Markdown. The notes should be highly detailed, comprehensive, and well-structured.

  Instructions:
  - **Use Markdown Formatting Extensively:** Employ headings (#, ##, ###), subheadings, bold (\*\***bold**\*\*), italics (\**italics*\*), bullet points (\* or -), numbered lists (1., 2.), and code blocks (\`\`\`) for examples or definitions where appropriate. Use horizontal rules (---) to separate major sections if needed.
  - **Be Exceptionally Comprehensive:** Cover all major topics and subtopics presented in the chapter content. Provide detailed explanations, definitions, and examples. Do not omit important information.
  - **Structure Logically:** Organize the notes with a clear hierarchy using headings and subheadings. Start with main topics and break them down into smaller, digestible sections.
  - **Use Lists Effectively:** Present key points, definitions, steps in a process, or classifications using bulleted or numbered lists for clarity.
  - **Explain Complex Concepts:** Simplify complex ideas using clear language suitable for the specified grade level. Use analogies or examples where helpful.
  - **Tailor to Audience:** Ensure the notes are appropriate for a {{gradeLevel}} student studying {{subject}}.
  - **Enhance Readability:** Use whitespace (empty lines) effectively to separate paragraphs and sections, making the notes easier to scan and read. Ensure good contrast if specifying colors (though standard markdown doesn't support color directly).

  Example Notes Structure (Illustrative):

  # Chapter Title (e.g., Introduction to Biology)

  ## 1. What is Biology?
     - Definition: Biology is the scientific study of life or living things.
     - Key characteristics of living things:
       * Made of cells
       * Require energy
       * Respond to stimuli
       * Grow and develop
       * Reproduce
       * Excrete waste
       * Maintain homeostasis
       * Adapt over time

  ## 2. The Scientific Method
     ### Steps:
       1. **Observation:** Noticing something in the natural world.
       2. **Question:** Asking why or how something happens.
       3. **Hypothesis:** Proposing a testable explanation.
       4. **Experimentation:** Designing and conducting tests to validate the hypothesis.
       5. **Analysis:** Interpreting the results of the experiment.
       6. **Conclusion:** Deciding if the hypothesis is supported or needs modification.
       7. **Communication:** Sharing findings with others.

     ### Key Terms:
       *  \`Hypothesis\`: A proposed scientific explanation.
       *  \`Variable\`: A factor that can change in an experiment.

  ## 3. Tools of a Biologist
     ### Laboratory Tools:
       *  Microscope: Used to view small objects.
          - \`Magnification\`: How much larger an image appears.
          - \`Resolution\`: The ability to distinguish between two points.
       *  Hand lens: Simple magnification tool.
       *  Autoclave: Sterilizes equipment.
       *  Incubator: Maintains temperature for cultures.
       *  Petri dishes: Used for growing microorganisms.

     ### Field Tools:
       *  Insect nets
       *  Fishing nets

  ---

  Textbook Chapter Content:
  {{{textbookChapter}}}

  Generate the detailed Markdown notes below:
  Notes:`,
});


// Renamed function for clarity
const generateNotesWithRetry = async (input: GenerateNotesInput, retries = 3, delay = 1000): Promise<{ output: GenerateNotesOutput | null }> => {
  try {
    // Directly await the prompt execution here
    const result = await generateNotesPrompt(input);
    return result; // Return the whole result object which includes 'output'
  } catch (e: any) {
    // Check if the error is a 503 and retries are available
    if (retries > 0 && e.message && e.message.includes('503 Service Unavailable')) {
      console.log(`Retrying generateNotesPrompt in ${delay}ms... (retries remaining: ${retries})`);
      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delay));
      // Recursive call with decremented retries and increased delay
      return generateNotesWithRetry(input, retries - 1, delay * 2); // Exponential backoff
    }
    // If it's not a 503 error or retries are exhausted, re-throw the error
    console.error("Error generating notes:", e); // Log the error for debugging
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
    // Call the renamed retry function
    const { output } = await generateNotesWithRetry(input);
    if (!output) {
       // Handle the case where retries failed and output is null
      throw new Error("Failed to generate notes after multiple retries.");
    }
    return output;
  }
);
