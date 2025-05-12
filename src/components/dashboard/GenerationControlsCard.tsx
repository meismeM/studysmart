// src/components/dashboard/GenerationControlsCard.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, ListChecks, HelpCircle, Loader2 } from 'lucide-react';
import { ExplicitQuestionTypeValue, questionTypeTitles, availableQuestionTypes } from '@/types/dashboard'; // Assuming you move types to a shared file

interface GenerationControlsCardProps {
  isGeneratingNotes: boolean;
  isGeneratingAnyQuestion: boolean; // True if any question type is being generated
  isAnyOperationPending: boolean; // Overall pending state for disabling
  componentError: string | null;
  onGenerateNotes: () => Promise<void>;
  onGenerateQuestions: (questionType: ExplicitQuestionTypeValue) => Promise<void>;
  // Props for isGeneratingQuestions (per type) and questionGenerationMessage (per type) might be needed if messages are very specific
  // For simplicity now, using isGeneratingAnyQuestion.
}

export const GenerationControlsCard: React.FC<GenerationControlsCardProps> = ({
  isGeneratingNotes,
  isGeneratingAnyQuestion,
  isAnyOperationPending,
  componentError,
  onGenerateNotes,
  onGenerateQuestions,
}) => {
  return (
    <Card className="mb-8 md:mb-10 shadow-lg dark:shadow-slate-800/50 border border-border/50">
      <CardHeader className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <CardTitle className="text-lg sm:text-xl md:text-2xl">Generate Study Aids</CardTitle>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground sm:text-right">
            Create notes or questions from selected content.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 p-5 md:p-6">
        <Button
          onClick={onGenerateNotes}
          disabled={isGeneratingNotes || isAnyOperationPending || !!componentError}
          size="lg"
          aria-busy={isGeneratingNotes}
          className="sm:col-span-1 md:col-span-1"
        >
          {isGeneratingNotes ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          <span className="hidden sm:inline">Generate </span>Notes
        </Button>
        {availableQuestionTypes.map((type) => {
          const title = questionTypeTitles[type];
          // We'd need more granular loading state from parent if we want per-button spinners accurately
          const isLoadingThisType = false; // Simplified for now; parent would need to provide per-type loading
          const Icon = type === 'multiple-choice' ? ListChecks : HelpCircle;
          return (
            <Button
              key={type}
              onClick={() => onGenerateQuestions(type)}
              disabled={isLoadingThisType || isGeneratingNotes || isAnyOperationPending || !!componentError}
              size="lg"
              aria-busy={isLoadingThisType}
              variant="secondary"
              className="sm:col-span-1 md:col-span-1"
            >
              {isLoadingThisType ? ( // Placeholder for more specific loading
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}
              <span className="hidden sm:inline">Generate </span>
              {title.replace('Multiple Choice', 'MCQ').replace('Fill-in-the-Blank','FIB').replace('True/False','T/F').replace('Short Answer','Short')}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
};