// src/components/dashboard/QuestionTypeTabContent.tsx
'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ListChecks } from 'lucide-react';
// CORRECTED: Imported questionTypeTitles
import { Question, CurrentQuestionTypeValue, questionTypeTitles } from '@/types/dashboard'; 
import { QuestionItemRenderer } from './QuestionItemRenderer';
import { renderInlineFormatting } from '@/lib/utils'; // Assuming utils is in src/lib

interface QuestionTypeTabContentProps {
  questionType: CurrentQuestionTypeValue;
  questions: Question[];
  isLoading: boolean;
  loadingMessage: string | null;
  isSetSubmitted: boolean;
  selectedAnswersForThisType: Record<number, number | undefined>;
  onMcqOptionSelect: (questionIndex: number, optionIndex: number) => void;
  showAnswerStates: Record<number, boolean>; 
  onToggleAnswerVisibility: (questionType: CurrentQuestionTypeValue, questionIndex: number) => void;
}

export const QuestionTypeTabContent: React.FC<QuestionTypeTabContentProps> = ({
  questionType,
  questions,
  isLoading,
  loadingMessage,
  isSetSubmitted,
  selectedAnswersForThisType,
  onMcqOptionSelect,
  showAnswerStates,
  onToggleAnswerVisibility,
}) => {
  if (isLoading && questions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center">
        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" />
        {/* Ensure questionTypeTitles is used here for consistency if needed in loadingMessage */}
        <p className="text-xs md:text-sm font-medium">{loadingMessage || `Generating ${questionTypeTitles[questionType]}...`}</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center">
        <ListChecks className="h-10 w-10 md:h-12 md:w-12 mb-4 opacity-50" />
        <p className="text-xs md:text-sm font-medium">No Questions Yet</p>
        {/* This is where the error occurred */}
        <p className="text-xs mt-1">Generate some '{questionTypeTitles[questionType]}' questions!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full">
      <ul className="space-y-5 md:space-y-6 p-5 md:p-8">
        {questions.map((questionItem, qIndex) => (
          <li key={`${questionType}-${qIndex}`} className="border rounded-lg p-4 md:p-5 shadow-sm bg-background dark:border-slate-700">
            <p className="font-medium mb-2 md:mb-3 text-sm md:text-base flex items-start">
              <span className="text-primary/90 mr-2 font-semibold">{qIndex + 1}.</span>
              <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(questionItem.question) }} />
            </p>
            <QuestionItemRenderer
              questionType={questionType}
              questionData={questionItem}
              questionIndex={qIndex}
              isSetSubmitted={isSetSubmitted}
              selectedOption={selectedAnswersForThisType?.[qIndex]}
              onMcqOptionSelect={onMcqOptionSelect} // Directly pass the handler for this specific question index
              isAnswerVisible={showAnswerStates?.[qIndex] || false}
              onToggleAnswerVisibility={onToggleAnswerVisibility}
            />
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
};