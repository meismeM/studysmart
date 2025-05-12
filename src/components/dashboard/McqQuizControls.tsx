// src/components/dashboard/McqQuizControls.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface McqQuizControlsProps {
  questionsExist: boolean;
  isSetSubmitted: boolean;
  scoreData: { userScore: number, scorableQuestions: number, totalQuestions: number } | null;
  onSubmitMcq: () => void;
  // To disable submit button
  areAllMcqsAnswered: boolean;
  isAnyGenerationPending: boolean;
}

export const McqQuizControls: React.FC<McqQuizControlsProps> = ({
  questionsExist,
  isSetSubmitted,
  scoreData,
  onSubmitMcq,
  areAllMcqsAnswered,
  isAnyGenerationPending,
}) => {
  if (!questionsExist) return null;

  if (!isSetSubmitted) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={onSubmitMcq}
        disabled={!areAllMcqsAnswered || isAnyGenerationPending}
      >
        <Send className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" /> Submit All MCQs
      </Button>
    );
  }

  if (isSetSubmitted && scoreData) {
    return (
      <div className="text-xs md:text-sm font-semibold p-1.5 px-2.5 rounded-md bg-muted border">
        Score: {scoreData.userScore} / {scoreData.scorableQuestions}
        <span className="text-muted-foreground text-xs ml-1">({scoreData.totalQuestions} Qs)</span>
      </div>
    );
  }

  return null; // Should not happen if logic is correct (submitted but no score)
};