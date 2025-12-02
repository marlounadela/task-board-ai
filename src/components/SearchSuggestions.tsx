"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchSuggestion {
  id: string;
  title: string;
  description?: string;
  status: string;
  boardName: string;
  boardId: string;
  assignee?: { name: string; image?: string };
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  isOpen: boolean;
  onSelect: (taskId: string, boardId: string) => void;
  onClose: () => void;
  searchQuery: string;
}

export function SearchSuggestions({
  suggestions,
  isOpen,
  onSelect,
  onClose,
  searchQuery
}: SearchSuggestionsProps) {
  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
      case "in-progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "review":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "done":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-96 overflow-y-auto">
      <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
          <Search className="w-4 h-4" />
          <span>{suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="py-1">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => {
              onSelect(suggestion.id, suggestion.boardId);
            }}
            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {highlightText(suggestion.title, searchQuery)}
                  </h4>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(
                      suggestion.status
                    )}`}
                  >
                    {suggestion.status}
                  </span>
                </div>
                {suggestion.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                    {highlightText(suggestion.description, searchQuery)}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-500">
                  <span className="truncate">{suggestion.boardName}</span>
                  {suggestion.assignee && (
                    <span className="flex items-center gap-1">
                      <span>•</span>
                      <span>{suggestion.assignee.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

