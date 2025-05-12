// src/components/dashboard/SavedNotesDropdown.tsx
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
import { History, Trash2, Loader2 } from 'lucide-react';
import { SavedNote } from '@/types/dashboard'; // Assuming you move types to a shared file

interface SavedNotesDropdownProps {
  savedNotesItems: Array<{ key: string; data: SavedNote }>;
  onLoadNote: (key: string) => void;
  onDeleteNote: (key: string) => void;
  isDeletingKey: string | null;
}

export const SavedNotesDropdown: React.FC<SavedNotesDropdownProps> = ({
  savedNotesItems,
  onLoadNote,
  onDeleteNote,
  isDeletingKey,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs md:text-sm">
          <History className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Load Saved</span> Notes
          {savedNotesItems.length > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {savedNotesItems.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 md:w-96 max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Your Saved Notes (Local)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {savedNotesItems.length > 0 ? (
          <DropdownMenuGroup>
            {savedNotesItems.map(({ key, data }) => {
              const pageDisplay = (data.startPage && data.endPage) ? `(P ${data.startPage}-${data.endPage})` : '';
              const dateDisplay = new Date(data.timestamp).toLocaleDateString();
              const displayKey = `${data.subject} G${data.grade} ${pageDisplay} - ${dateDisplay}`.trim();
              return (
                <DropdownMenuItem
                  key={key}
                  onSelect={(e) => { e.preventDefault(); onLoadNote(key); }}
                  className="flex justify-between items-center cursor-pointer text-xs"
                >
                  <span className="truncate pr-2" title={displayKey}>{displayKey}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDeleteNote(key); }}
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
            No notes saved in this browser yet.
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};