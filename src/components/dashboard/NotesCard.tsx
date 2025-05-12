// src/components/dashboard/NotesCard.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Loader2, Save, Download } from 'lucide-react';
import { SavedNote } from '@/types/dashboard'; // Shared types
import { SavedNotesDropdown } from './SavedNotesDropdown';

interface NotesCardProps {
  generatedNotes: string;
  isGeneratingNotes: boolean;
  noteGenerationMessage: string | null;
  isSavingNotes: boolean;
  onSaveNotes: () => void;
  onDownloadNotesPdf: () => Promise<void>;
  // Props for saved notes dropdown
  savedNotesItems: Array<{ key: string; data: SavedNote }>;
  onLoadNote: (key: string) => void;
  onDeleteNote: (key: string) => void;
  isDeletingSavedNoteKey: string | null;
  // Markdown components
  markdownDisplayComponents: Components;
  isAnyOtherMajorOpPending: boolean; // To disable save/download if questions are generating etc.
}

export const NotesCard: React.FC<NotesCardProps> = ({
  generatedNotes,
  isGeneratingNotes,
  noteGenerationMessage,
  isSavingNotes,
  onSaveNotes,
  onDownloadNotesPdf,
  savedNotesItems,
  onLoadNote,
  onDeleteNote,
  isDeletingSavedNoteKey,
  markdownDisplayComponents,
  isAnyOtherMajorOpPending,
}) => {
  return (
    <Card className="shadow-md dark:shadow-slate-800/50 border border-border/50 flex flex-col min-h-[500px] md:min-h-[600px] lg:min-h-[700px] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary/80" /> Generated Notes
        </CardTitle>
        <div className="flex items-center gap-2">
          <SavedNotesDropdown
            savedNotesItems={savedNotesItems}
            onLoadNote={onLoadNote}
            onDeleteNote={onDeleteNote}
            isDeletingKey={isDeletingSavedNoteKey}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveNotes}
            disabled={!generatedNotes.trim() || isGeneratingNotes || isSavingNotes || isAnyOtherMajorOpPending}
            title="Save Current Notes Locally"
          >
            {isSavingNotes ? (
              <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />
            )}
            <span className="hidden sm:inline">Save</span>
            <span className="sm:hidden">Save</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadNotesPdf}
            disabled={!generatedNotes.trim() || isGeneratingNotes || isSavingNotes || isAnyOtherMajorOpPending}
            title="Download Notes as PDF"
          >
            <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />
            <span className="hidden sm:inline">Download </span>PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-0">
        {isGeneratingNotes && !generatedNotes ? (
          <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mb-4 text-primary" />
            <p className="text-xs md:text-sm font-medium">{noteGenerationMessage || "Generating notes..."}</p>
          </div>
        ) : !generatedNotes.trim() ? (
          <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground p-6 text-center">
            <FileText size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">No Notes Generated</p>
            <p className="text-xs mt-1">Click "Generate Notes" to create some.</p>
          </div>
        ) : (
          <ScrollArea className="flex-grow w-full rounded-b-lg border-t dark:border-slate-700">
            <div className="p-5 md:p-8">
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownDisplayComponents}>
                  {generatedNotes}
                </ReactMarkdown>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};