// src/components/dashboard/SavedQuestionSetsDropdown.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { FileQuestion, Trash2, Loader2 } from 'lucide-react';
import { SavedQuestionSet, questionTypeTitles, CurrentQuestionTypeValue } from '@/types/dashboard'; // Shared types

interface SavedQuestionSetsDropdownProps {
  savedQuestionSetItems: Array<{ key: string; data: SavedQuestionSet }>;
  onLoadSet: (key: string) => void;
  onDeleteSet: (key: string) => void;
  isDeletingKey: string | null;
}

export const SavedQuestionSetsDropdown: React.FC<SavedQuestionSetsDropdownProps> = ({
  savedQuestionSetItems,
  onLoadSet,
  onDeleteSet,
  isDeletingKey,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs md:text-sm">
          <FileQuestion className="h-3.5 w-3.5 mr-1.5" />
          Load Saved Qs
          {savedQuestionSetItems.length > 0 && (
            <span className="ml-1.5 bg-primary text-primary-foreground text-[0.65rem] px-1.5 py-0.5 rounded-full">
              {savedQuestionSetItems.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 md:w-96 max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Saved Question Sets (Local)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {savedQuestionSetItems.length > 0 ? (
          <DropdownMenuGroup>
            {savedQuestionSetItems.map(({ key, data }) => {
              const pageDisplay = (data.startPage && data.endPage) ? `(P ${data.startPage}-${data.endPage})` : '';
              const dateDisplay = new Date(data.timestamp).toLocaleDateString();
              const typeDisplay = questionTypeTitles[data.questionType]?.replace('Multiple Choice','MCQ') || data.questionType;
              const displayKey = `${data.subject} G${data.grade} ${pageDisplay} - ${typeDisplay} - ${dateDisplay}`.trim();
              return (
                <DropdownMenuItem
                  key={key}
                  onSelect={(e) => { e.preventDefault(); onLoadSet(key); }}
                  className="flex justify-between items-center cursor-pointer text-xs"
                >
                  <span className="truncate pr-2" title={displayKey}>{displayKey}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDeleteSet(key); }}
                    disabled={isDeletingKey === key}
                    title={`Delete: ${displayKey}`}
                  >
                    {isDeletingKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            No question sets saved.
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};