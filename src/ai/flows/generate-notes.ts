// src/ai/flows/generate-notes.ts

'use server';

/**
 * @fileOverview Generates notes for a given chapter of a textbook using AI,
 * formatted with Markdown for improved readability and easier styling.
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
  // Consider adding input validation here if needed before calling the flow
  // e.g., if (input.textbookChapter.length < 50) throw new Error("Chapter content too short.");
  return generateNotesFlow(input);
}

// --- Enhanced Prompt for Higher Quality Notes ---
const generateNotesPrompt = ai.definePrompt({
  name: 'generateNotesPromptV3', // Increment version
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
  // --- REVISED AND DETAILED PROMPT ---
  prompt: `You are an exceptionally skilled AI Tutor and Study Assistant. Your task is to generate **highly detailed, comprehensive, logically structured, and impeccably formatted** study notes based *exclusively* on the provided textbook chapter content. The notes are for a {{gradeLevel}} student studying {{subject}}. The output *must* be in Markdown, utilizing its features strategically for maximum clarity, readability, and visual appeal when rendered on a webpage.

  **Core Objective:** Produce notes that are significantly more detailed and better organized than a simple summary. They should serve as a primary study resource, enabling deep understanding and efficient review. Err on the side of including *more* relevant detail from the text, rather than less.

  **Advanced Guidelines & Formatting Instructions:**

  1.  **Structure & Hierarchy (CRITICAL):**
      *   **Main Title:** Start with a clear H1 heading (\`#\`) for the chapter topic.
      *   **Sections & Subsections:** Use H2 (\`##\`) for major sections and H3 (\`###\`) for sub-sections within them. Maintain a consistent and logical hierarchy reflecting the chapter's structure. Use H4 (\`####\`) sparingly if absolutely necessary for finer granularity.
      *   **Introduction/Overview:** Briefly introduce the main topics covered in the notes section (perhaps using a blockquote \`>\`).
      *   **Logical Flow:** Ensure smooth transitions between sections. Each section should build upon the previous one where appropriate.
      *   **Section Summaries (Optional but Recommended):** Consider adding a brief bulleted summary or key takeaway blockquote at the end of major sections.

  2.  **Content Depth & Detail:**
      *   **Exhaustive Coverage:** Meticulously extract and explain *all* key concepts, definitions, principles, processes, examples, and significant facts presented in the provided text.
      *   **Elaboration:** Do not just list points. *Explain* them clearly and concisely. Provide context and clarify relationships between concepts *based on the source text*.
      *   **Definitions:** Clearly define all important terms introduced. Format definitions consistently (e.g., \`**Term:** *Definition text...*\`).
      *   **Examples:** Include relevant examples *from the text* to illustrate concepts. Format them clearly, perhaps using indented lists or code blocks if appropriate.
      *   **Processes/Steps:** Use numbered lists ('1.', '2.') to outline sequential steps or processes accurately.

  3.  **Markdown Formatting Excellence:**
      *   **Strategic Emphasis:** Use \`**bold**\` for highlighting absolutely crucial terms, names, or concepts the student *must* remember. Use \`*italics*\` for definitions, adding nuance, or gentle emphasis. Avoid overusing either.
      *   **Lists (Bulleted & Numbered):** Use bullet points (\`*\` or \`-\`) for characteristics, related concepts, pros/cons, etc. Use numbered lists (\`1.\`, \`2.\`) for sequences or ordered items. Use nested lists (indentation) logically where sub-points exist. Ensure proper spacing around lists.
      *   **Code Formatting:** Use backticks (\`inline code\`) for specific technical terms, variable names, commands, or short code snippets. Use triple backticks (\`\`\` \`\`\`) for multi-line code examples, formulas, or complex definitions if applicable (specify language if known, e.g., \`\`\`python).
      *   **Blockquotes (\`>\`):** Use for highlighting key definitions, important summaries, significant quotes from the text (if any), or "Key Takeaway" boxes.
      *   **Horizontal Rules (\`---\`):** Use effectively to create strong visual separation between major, distinct sections of the notes. Don't overuse them within a single logical topic.
      *   **Readability:** Employ whitespace (blank lines) generously to separate paragraphs, headings, lists, and other elements. Break down long paragraphs into smaller, focused ones.

  4.  **Audience Adaptation:** Maintain language and complexity appropriate for a {{gradeLevel}} student studying {{subject}}. Define potentially complex terms clearly.

  5.  **Source Adherence:** Generate notes **ONLY** from the provided \`{{{textbookChapter}}}\` content. Do not add external information, opinions, or summaries not directly supported by the text.

  **Example Snippet (Illustrating desired formatting & detail):**

  # Photosynthesis: Capturing Light Energy

  > This section details how plants convert light energy into chemical energy in the form of glucose.

  ## 1. Overview of Photosynthesis

     - **Definition:** *The process used by plants, algae, and cyanobacteria to convert light energy into chemical energy, through a process that uses sunlight, water, and carbon dioxide.*
     - **Significance:** Provides the primary source of energy for most ecosystems and produces oxygen essential for aerobic respiration.
     - **Overall Chemical Equation:**
       \`\`\`
       6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂
       \`\`\`
       *   **Reactants:** Carbon Dioxide (CO₂), Water (H₂O)
       *   **Products:** Glucose (C₆H₁₂O₆), Oxygen (O₂)

  ### 1.1 Location in Eukaryotic Cells
     - Photosynthesis occurs within specialized organelles called **chloroplasts**.
     - **Key Chloroplast Structures:**
        *   *Thylakoids:* Membranous sacs where light-dependent reactions occur. Stacks of thylakoids are called *grana*.
        *   *Stroma:* The fluid-filled space surrounding the grana, where the Calvin cycle (light-independent reactions) takes place.
        *   *Pigments:* Molecules like chlorophyll absorb light energy. Located in thylakoid membranes.

  ---

  ## 2. Light-Dependent Reactions
     - **Goal:** Convert light energy into chemical energy (ATP and NADPH).
     - **Location:** Thylakoid membranes.
     - **Requires:** Light, Water, NADP+, ADP + Pᵢ
     - **Key Steps:**
        1.  **Light Absorption:** Chlorophyll and other pigments absorb photons.
        2.  **Water Splitting (Photolysis):** Water molecules are split, releasing oxygen (O₂), electrons (e⁻), and protons (H⁺).
        3.  **Electron Transport Chain:** Energized electrons move through protein complexes, releasing energy.
        4.  **ATP Synthesis (Chemiosmosis):** The energy released is used to pump H⁺ ions, creating a gradient that drives ATP synthase to produce **ATP**.
        5.  **NADPH Formation:** Electrons ultimately reduce NADP⁺ to **NADPH**.

     > **Key Takeaway:** The light reactions capture solar energy and store it temporarily in the chemical bonds of ATP and NADPH.

  ---

  **(Continue with Calvin Cycle, Factors Affecting Photosynthesis, etc., maintaining this level of detail and formatting)**

  ---

  **Textbook Chapter Content:**
  \`\`\`text
  {{{textbookChapter}}}
  \`\`\`

  ---

  **Generate the comprehensive, detailed, and well-formatted Markdown notes below:**
  `,
});


// Helper function with retry logic (robust version - keep as is)
const generateNotesWithRetry = async (input: GenerateNotesInput, retries = 3, delay = 1000): Promise<{ output: GenerateNotesOutput | null }> => {
  console.log(`[Notes Retry] Attempting generation... (${retries} retries left)`);
  try {
    const result = await generateNotesPrompt(input);
    console.log(`[Notes Retry] Success.`);
     if (!result?.output?.notes?.trim()) {
        console.warn("[Notes Retry] AI returned empty notes content.");
        // Optionally throw an error here if empty notes are unacceptable
        // throw new Error("AI returned empty notes.");
    }
    return result;
  } catch (e: any) {
    console.warn(`[Notes Retry] Failed: ${e.message}`);
    if (retries > 0 && e.message && ( e.message.includes('503') || e.message.includes('429') || e.message.toLowerCase().includes('overloaded') || e.message.toLowerCase().includes('rate limit') || e.message.toLowerCase().includes('empty output') || e.message.toLowerCase().includes('timed out') )) {
      const retryDelay = delay * Math.pow(2, 3 - retries);
      console.warn(`[Notes Retry] Retrying in ${retryDelay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return generateNotesWithRetry(input, retries - 1, retryDelay);
    }
    console.error("[Notes Retry] Final failure:", e);
    let userErrorMessage = `Failed to generate notes: ${e.message || 'Unknown AI error'}.`;
    if (e.message?.toLowerCase().includes('content filter')) { userErrorMessage = 'Note generation failed due to content filtering.'; }
    else if (e.message?.toLowerCase().includes('invalid json') || e.message?.toLowerCase().includes('failed to parse')) { userErrorMessage = 'AI response format was invalid. Could not generate notes.'; }
    throw new Error(userErrorMessage);
  }
};

// Flow Definition (keep as is)
const generateNotesFlow = ai.defineFlow<
  typeof GenerateNotesInputSchema,
  typeof GenerateNotesOutputSchema
>(
  { name: 'generateNotesFlow', inputSchema: GenerateNotesInputSchema, outputSchema: GenerateNotesOutputSchema },
  async input => {
    console.log(`[Notes Flow] Starting generation for Subject: ${input.subject}, Grade: ${input.gradeLevel}`);
    const result = await generateNotesWithRetry(input);
    if (!result?.output?.notes?.trim()) {
       console.error("[Notes Flow] Failed: No notes content returned after retries.");
       throw new Error("AI failed to generate notes content after multiple retries.");
    }
    console.log(`[Notes Flow] Success. Notes length: ${result.output.notes.length}`);
    return result.output;
  }
);

