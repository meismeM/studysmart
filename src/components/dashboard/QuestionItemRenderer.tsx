// src/components/dashboard/QuestionItemRenderer.tsx
'use client';

import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Question, CurrentQuestionTypeValue } from '@/types/dashboard'; // Shared types
import { renderInlineFormatting, getCorrectAnswerLetter, getFinalMcqCorrectIndex } from '@/lib/utils'; // Assuming utils moved here

interface QuestionItemRendererProps {
  questionType: CurrentQuestionTypeValue;
  questionData: Question;
  questionIndex: number;
  isSetSubmitted: boolean; // For the whole set/tab
  selectedOption: number | undefined; // For MCQ
  onMcqOptionSelect: (questionIndex: number, optionIndex: number) => void; // For MCQ
  isAnswerVisible: boolean; // For this specific question
  onToggleAnswerVisibility: (questionType: CurrentQuestionTypeValue, questionIndex: number) => void;
}

export const QuestionItemRenderer: React.FC<QuestionItemRendererProps> = ({
  questionType,
  questionData,
  questionIndex,
  isSetSubmitted,
  selectedOption,
  onMcqOptionSelect,
  isAnswerVisible,
  onToggleAnswerVisibility,
}) => {
  const isMCQ = questionType === 'multiple-choice';

  const AnswerReveal = ({ derivedLetter, originalLetter }: { derivedLetter: string | null, originalLetter: string | null }) => {
    const displayLetter = isMCQ ? (derivedLetter ?? originalLetter) : null;
    return (
      <div className="mt-3 p-3 md:p-4 bg-muted/70 dark:bg-muted/40 rounded-md border border-border/50 space-y-2 md:space-y-3 text-xs md:text-sm">
        {isMCQ ? (
          displayLetter ? (
            <p className="font-semibold text-green-700 dark:text-green-400">
              Correct Answer: {displayLetter}
              {derivedLetter && !originalLetter && (
                <span className="text-xs font-normal text-muted-foreground ml-2">(Derived from ✓)</span>
              )}
            </p>
          ) : ( <p className="font-semibold text-orange-600 dark:text-orange-400">Correct answer could not be determined.</p> )
        ) : questionData.answer?.trim() ? (
          <div>
            <strong className="text-foreground/80 block mb-1">Answer:</strong>
            <span className="block pl-2" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(questionData.answer) }} />
          </div>
        ) : ( <p className="font-semibold text-red-600 dark:text-red-400">Answer not provided.</p> )}
        {questionData.explanation?.trim() ? (
          <div className="text-muted-foreground mt-2 pt-2 border-t border-border/30">
            <strong className="text-foreground/80 block mb-1">Explanation:</strong>
            <span className="block pl-2" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(questionData.explanation) }} />
          </div>
        ) : (
          (isMCQ || questionType === 'true-false') && (isAnswerVisible || isSetSubmitted) &&
          <p className="text-muted-foreground italic mt-2 pt-2 border-t border-border/30 text-xs">
            Explanation not provided{isMCQ && !displayLetter ? ' (and answer is undetermined)' : ''}.
          </p>
        )}
      </div>
    );
  };

  const RevealButton = () => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onToggleAnswerVisibility(questionType, questionIndex)}
      className="mt-3 transition-colors text-xs"
    >
      {isAnswerVisible ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
      {isAnswerVisible ? 'Hide' : 'Show'} Explanation
    </Button>
  );

  if (isMCQ) {
    const options = questionData.options ?? [];
    const finalCorrectIndex = getFinalMcqCorrectIndex(questionData);
    const cleanedOptions = options.map(opt => typeof opt === 'string' ? opt.replace(/✓/g, '').trim() : String(opt));

    return (
      <div className="mt-2 md:mt-3 space-y-1.5 md:space-y-2">
        <RadioGroup
          value={selectedOption?.toString()}
          onValueChange={(value) => onMcqOptionSelect(questionIndex, parseInt(value))}
          className="space-y-2 mt-3"
          disabled={isSetSubmitted}
        >
          {cleanedOptions.map((choice, choiceIndex) => {
            const L = getCorrectAnswerLetter(choiceIndex);
            const uniqueId = `q-${questionType}-${questionIndex}-opt-${choiceIndex}`;
            let optionStyle = `border-input hover:border-primary/50 ${isSetSubmitted ? 'cursor-default' : 'cursor-pointer'}`;
            let icon = null;

            if (isSetSubmitted && typeof finalCorrectIndex === 'number') {
              const isActuallyCorrect = finalCorrectIndex === choiceIndex;
              if (isActuallyCorrect) {
                optionStyle = 'bg-green-100 dark:bg-green-900/60 border-green-500 font-medium ring-1 ring-green-500';
                icon = <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto shrink-0" />;
              } else if (selectedOption === choiceIndex && !isActuallyCorrect) {
                optionStyle = 'bg-red-100 dark:bg-red-900/60 border-red-500 ring-1 ring-red-500';
                icon = <XCircle className="h-4 w-4 text-red-600 dark:text-red-500 ml-auto shrink-0" />;
              } else {
                optionStyle = 'bg-background/70 border-border opacity-70';
              }
            } else if (selectedOption === choiceIndex && !isSetSubmitted) {
              optionStyle = 'bg-primary/10 border-primary ring-1 ring-primary';
            }

            return (
              <Label key={uniqueId} htmlFor={uniqueId} className={`flex items-center p-2 md:p-2.5 rounded-md border text-xs md:text-sm transition-all duration-150 ease-in-out ${optionStyle}`}>
                <RadioGroupItem value={choiceIndex.toString()} id={uniqueId} className="mr-3 shrink-0" />
                <span className="font-semibold mr-1.5 text-primary/80 w-4">{L ?? '?'}:</span>
                <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(choice) }} />
                {icon}
              </Label>
            );
          })}
        </RadioGroup>
        {(isSetSubmitted || isAnswerVisible) && <RevealButton />}
        {(isSetSubmitted || isAnswerVisible) && <AnswerReveal derivedLetter={null} originalLetter={getCorrectAnswerLetter(finalCorrectIndex)} />}
      </div>
    );
  } else { // For Short Answer, True/False, Fill-in-the-blank
    return (
      <div className="mt-2 md:mt-3">
        <RevealButton />
        {isAnswerVisible && <AnswerReveal derivedLetter={null} originalLetter={questionData.answer ?? null} />}
      </div>
    );
  }
};