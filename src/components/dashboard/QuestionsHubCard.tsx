// src/components/dashboard/QuestionsHubCard.tsx
'use client';

import React, { useMemo } from 'react'; // <--- FIXED: Imported useMemo
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { HelpCircle, Download, Save, Loader2 } from 'lucide-react';
import { 
  Question, CurrentQuestionTypeValue, ExplicitQuestionTypeValue, 
  availableQuestionTypes, questionTypeTitles, SavedQuestionSet 
} from '@/types/dashboard'; // Shared types
import { QuestionTypeTabContent } from './QuestionTypeTabContent';
import { McqQuizControls } from './McqQuizControls';
import { SavedQuestionSetsDropdown } from './SavedQuestionSetsDropdown';

interface QuestionsHubCardProps {
  // Current active tab
  activeQuestionTab: CurrentQuestionTypeValue;
  onTabChange: (newTab: CurrentQuestionTypeValue) => void;

  // Data for all tabs
  generatedQuestions: Record<CurrentQuestionTypeValue, Question[]>;
  isGeneratingQuestions: Record<CurrentQuestionTypeValue, boolean>;
  questionGenerationMessage: Record<CurrentQuestionTypeValue, string | null>;
  
  // MCQ specific state & handlers
  selectedAnswers: Record<CurrentQuestionTypeValue, Record<number, number | undefined>>;
  submittedMcqs: Record<CurrentQuestionTypeValue, boolean>;
  mcqScores: Record<CurrentQuestionTypeValue, { userScore: number, scorableQuestions: number, totalQuestions: number } | null>;
  onMcqOptionSelect: (questionType: CurrentQuestionTypeValue, questionIndex: number, optionIndex: number) => void;
  onSubmitMcq: (questionType: CurrentQuestionTypeValue) => void;
  
  // Answer visibility state & handler
  showAnswer: Record<CurrentQuestionTypeValue, Record<number, boolean>>;
  onToggleAnswerVisibility: (questionType: CurrentQuestionTypeValue, questionIndex: number) => void;

  // General state
  componentError: string | null;
  isGeneratingNotes: boolean; 

  // Download handler
  onDownloadQuestionsPdf: (questionType: CurrentQuestionTypeValue) => Promise<void>;

  // Saving/Loading Question Sets
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
  
  const areAllMcqsAnsweredForCurrentTab = useMemo(() => { // useMemo was used here
    if (activeQuestionTab !== 'multiple-choice' || !currentQuestions || currentQuestions.length === 0) return false;
    const currentSelected = selectedAnswers[activeQuestionTab] || {};
    return currentQuestions.every((_, index) => currentSelected[index] !== undefined);
  }, [activeQuestionTab, currentQuestions, selectedAnswers]);

  return (
    <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-primary/80" /> Practice Questions
        </CardTitle>
        <div className="flex items-center gap-2">
          {activeQuestionTab === 'multiple-choice' && (
            <McqQuizControls
              questionsExist={currentQuestions.length > 0}
              isSetSubmitted={submittedMcqs[activeQuestionTab] || false}
              scoreData={mcqScores[activeQuestionTab] || null}
              onSubmitMcq={() => onSubmitMcq(activeQuestionTab)}
              areAllMcqsAnswered={areAllMcqsAnsweredForCurrentTab}
              isAnyGenerationPending={isGeneratingNotes || isLoadingCurrentTab}
            />
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
              onClick={() => onSaveQuestionSet(activeQuestionTab)}
              disabled={isLoadingCurrentTab || isSavingQuestions || isGeneratingNotes}
              title="Save Current Question Set Locally"
            >
              {isSavingQuestions ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5 animate-spin" /> : <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />}
              <span className="hidden sm:inline">Save Qs</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownloadQuestionsPdf(activeQuestionTab)}
            disabled={currentQuestions.length === 0 || isLoadingCurrentTab || isGeneratingNotes}
            title={`Download ${questionTypeTitles[activeQuestionTab]} Questions as PDF`}
          >
            <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />
            <span className="hidden sm:inline">Download </span>PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pt-2 px-4 pb-4 md:px-6 md:pb-6">
        <Tabs defaultValue={activeQuestionTab} value={activeQuestionTab} onValueChange={(value) => onTabChange(value as CurrentQuestionTypeValue)} className="w-full flex flex-col flex-grow">
          <ScrollArea className="w-full whitespace-nowrap rounded-md mb-5 md:mb-6">
            <TabsList className="inline-grid w-max grid-cols-4">
              {availableQuestionTypes.map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  disabled={!!componentError || isGeneratingNotes || isGeneratingQuestions[type] || Object.values(isGeneratingQuestions).some(loading => loading && type !== activeQuestionTab)} // Refined disabling logic
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

