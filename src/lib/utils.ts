// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Question } from "@/types/dashboard"; // Adjust path as necessary

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const renderInlineFormatting = (text: string | null | undefined): string => { 
    if (!text) return ''; let html = String(text);
    html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '<em>$1</em>'); html = html.replace(/(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code class="bg-muted text-muted-foreground px-1 py-0.5 rounded font-mono text-sm">$1</code>'); html = html.replace(/__+/g, '<span class="italic text-muted-foreground">[blank]</span>'); return html; 
};

export const getCorrectAnswerLetter = (index?: number): string | null => { 
    if (typeof index !== 'number' || index < 0 || index > 3) return null; 
    return String.fromCharCode(65 + index); 
};

export const getFinalMcqCorrectIndex = (question: Question): number | undefined => {
    const options = question.options ?? []; let finalCorrectIndex = question.correctAnswerIndex;
    if (typeof finalCorrectIndex !== 'number' || finalCorrectIndex < 0 || finalCorrectIndex >= options.length) {
        if (typeof question.answer === 'string' && /^[A-D]$/i.test(question.answer) && options.length === 4) {
            const letterIndex = question.answer.toUpperCase().charCodeAt(0) - 65;
            if (letterIndex >= 0 && letterIndex < 4) { finalCorrectIndex = letterIndex; } else { finalCorrectIndex = undefined; }
        } else { 
            const derivedIndex = options.findIndex(opt => typeof opt === 'string' && opt.includes('✓')); 
            if (derivedIndex !== -1) { finalCorrectIndex = derivedIndex; } else { finalCorrectIndex = undefined; }
        }
    } return finalCorrectIndex;
};