// src/components/dashboard/QuestionsHubCard.tsx
'use client';

import React, { useMemo } from 'react'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { HelpCircle, Download, Save, Loader2 } from 'lucide-react';
import { 
  Question, CurrentQuestionTypeValue, 
  availableQuestionTypes, questionTypeTitles, SavedQuestionSet 
} from '@/types/dashboard'; 
import { QuestionTypeTabContent } from './QuestionTypeTabContent';
import { McqQuizControls } from './McqQuizControls';
import { SavedQuestionSetsDropdown } from './SavedQuestionSetsDropdown';

interface QuestionsHubCardProps {
  activeQuestionTab: CurrentQuestionTypeValue;
  onTabChange: (newTab: CurrentQuestionTypeValue) => void;
  generatedQuestions: Record<CurrentQuestionTypeValue, Question[]>;
  isGeneratingQuestions: Record<CurrentQuestionTypeValue, boolean>;
  questionGenerationMessage: Record<CurrentQuestionTypeValue, string | null>;
  selectedAnswers: Record<CurrentQuestionTypeValue, Record<number, number | undefined>>;
  submittedMcqs: Record<CurrentQuestionTypeValue, boolean>;
  mcqScores: Record<CurrentQuestionTypeValue, { userScore: number, scorableQuestions: number, totalQuestions: number } | null>;
  onMcqOptionSelect: (questionType: CurrentQuestionTypeValue, questionIndex: number, optionIndex: number) => void;
  onSubmitMcq: (questionType: CurrentQuestionTypeValue) => void;
  showAnswer: Record<CurrentQuestionTypeValue, Record<number, boolean>>;
  onToggleAnswerVisibility: (questionType: CurrentQuestionTypeValue, questionIndex: number) => void;
  componentError: string | null;
  isGeneratingNotes: boolean; 
  onDownloadQuestionsPdf: (questionType: CurrentQuestionTypeValue) => Promise<void>;
  isSavingQuestions: boolean;
  onSaveQuestionSet: (questionType: CurrentQuestionTypeValue) => void;
  savedQuestionSetItems: Array<{ key: string; data: SavedQuestionSet }>;
  onLoadSavedQuestionSet: (key: string) => void;
  onDeleteSavedQuestionSet: (key: string) => void;
  isDeletingSavedQuestionSetKey: string | null;
}

export const QuestionsHubCard: React.FC<QuestionsHubCardProps> = ({
  activeQuestionTab,
  onTabChange,
  generatedQuestions,
  isGeneratingQuestions,
  questionGenerationMessage,
  selectedAnswers,
  submittedMcqs,
  mcqScores,
  onMcqOptionSelect,
  onSubmitMcq,
  showAnswer,
  onToggleAnswerVisibility,
  componentError,
  isGeneratingNotes,
  onDownloadQuestionsPdf,
  isSavingQuestions,
  onSaveQuestionSet,
  savedQuestionSetItems,
  onLoadSavedQuestionSet,
  onDeleteSavedQuestionSet,
  isDeletingSavedQuestionSetKey,
}) => {
  const currentQuestions = generatedQuestions[activeQuestionTab] || [];
  const isLoadingCurrentTab = isGeneratingQuestions[activeQuestionTab] || false;
  
  const areAllMcqsAnsweredForCurrentTab = useMemo(() => { 
    if (activeQuestionTab !== 'multiple-choice' || !currentQuestions || currentQuestions.length === 0) return false;
    const currentSelected = selectedAnswers[activeQuestionTab] || {};
    return currentQuestions.every((_, index) => currentSelected[index] !== undefined);
  }, [activeQuestionTab, currentQuestions, selectedAnswers]);

  return (
    <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px] overflow-hidden">
      {/* --- CORRECTED HEADER --- */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-3 sm:gap-y-0 gap-x-2 pb-3 pt-4 px-4 md:pb-2 md:pt-6 md:px-6">
        <CardTitle className="text-base md:text-lg flex items-center gap-2 shrink-0">
          <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-primary/80" /> Practice Questions
        </CardTitle>
        {/* Button Group */}
        <div className="flex flex-col xs:flex-row xs:flex-wrap items-stretch xs:items-center gap-2 w-full xs:w-auto xs:justify-end"> {/* Added xs:flex-wrap */}
          {activeQuestionTab === 'multiple-choice' && (
            <div className="w-full xs:w-auto"> {/* Ensure MCQ controls can behave well in flex/wrap */}
              <McqQuizControls
                questionsExist={currentQuestions.length > 0}
                isSetSubmitted={submittedMcqs[activeQuestionTab] || false}
                scoreData={mcqScores[activeQuestionTab] || null}
                onSubmitMcq={() => onSubmitMcq(activeQuestionTab)}
                areAllMcqsAnswered={areAllMcqsAnsweredForCurrentTab}
                isAnyGenerationPending={isGeneratingNotes || isLoadingCurrentTab}
              />
            </div>
          )}
          <SavedQuestionSetsDropdown
            savedQuestionSetItems={savedQuestionSetItems}
            onLoadSet={onLoadSavedQuestionSet}
            onDeleteSet={onDeleteSavedQuestionSet}
            isDeletingKey={isDeletingSavedQuestionSetKey}
          />
          {currentQuestions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full xs:w-auto justify-center"
              onClick={() => onSaveQuestionSet(activeQuestionTab)}
              disabled={isLoadingCurrentTab || isSavingQuestions || isGeneratingNotes}
              title="Save Current Question Set Locally"
            >
              {isSavingQuestions ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/> : <Save className="h-3.5 w-3.5 mr-1.5"/>}
              Save Qs
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full xs:w-auto justify-center"
            onClick={() => onDownloadQuestionsPdf(activeQuestionTab)}
            disabled={currentQuestions.length === 0 || isLoadingCurrentTab || isGeneratingNotes}
            title={`Download ${questionTypeTitles[activeQuestionTab]} Questions as PDF`}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            PDF
          </Button>
        </div>
      </CardHeader>
      {/* --- END CORRECTED HEADER --- */}
      <CardContent className="flex-grow flex flex-col pt-2 px-4 pb-4 md:px-6 md:pb-6">
        {/* ... Tabs and TabsContent remain the same ... */}
        <Tabs defaultValue={activeQuestionTab} value={activeQuestionTab} onValueChange={(value) => onTabChange(value as CurrentQuestionTypeValue)} className="w-full flex flex-col flex-grow" >
          <ScrollArea className="w-full whitespace-nowrap rounded-md mb-5 md:mb-6">
            <TabsList className="inline-grid w-max grid-cols-4">
              {availableQuestionTypes.map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  disabled={!!componentError || isGeneratingNotes || isGeneratingQuestions[type] || Object.values(isGeneratingQuestions).some(loading => loading && type !== activeQuestionTab)}
                  className="text-xs px-2 sm:px-3"
                >
                  {questionTypeTitles[type].replace('Multiple Choice', 'MCQ').replace('Fill-in-the-Blank','FIB').replace('Short Answer', 'Short').replace('True/False','T/F')}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="flex-grow relative min-h-[400px] md:min-h-[450px] border rounded-md bg-muted/20 dark:bg-muted/30 overflow-hidden">
            {availableQuestionTypes.map((type) => (
              <TabsContent key={type} value={type} className="absolute inset-0 focus-visible:ring-0 focus-visible:ring-offset-0 m-0" tabIndex={-1}>
                <QuestionTypeTabContent
                  questionType={type}
                  questions={generatedQuestions[type] || []}
                  isLoading={isGeneratingQuestions[type] || false}
                  loadingMessage={questionGenerationMessage[type] || null}
                  isSetSubmitted={submittedMcqs[type] || false}
                  selectedAnswersForThisType={selectedAnswers[type] || {}}
                  onMcqOptionSelect={(qIndex, oIndex) => onMcqOptionSelect(type, qIndex, oIndex)}
                  showAnswerStates={showAnswer[type] || {}}
                  onToggleAnswerVisibility={onToggleAnswerVisibility}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
