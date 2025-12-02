"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface AiPanelProps {
  taskId?: string;
  onGenerate: (type: "subtasks" | "priority" | "summary") => Promise<void>;
}

export function AiPanel({ taskId, onGenerate }: AiPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (type: "subtasks" | "priority" | "summary") => {
    setLoading(type);
    try {
      await onGenerate(type);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={() => handleAction("subtasks")}
        disabled={!taskId || loading === "subtasks"}
        variant="outline"
        className="w-full justify-start h-12 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-800/30 dark:hover:to-pink-800/30 transition-all duration-200 group"
      >
        {loading === "subtasks" ? (
          <Loader2 className="h-4 w-4 mr-3 animate-spin text-purple-600" />
        ) : (
          <Sparkles className="h-4 w-4 mr-3 text-purple-600 group-hover:scale-110 transition-transform" />
        )}
        <div className="text-left">
          <div className="font-medium text-slate-900 dark:text-white">Generate Subtasks</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Break down complex tasks</div>
        </div>
      </Button>
      
      <Button
        onClick={() => handleAction("priority")}
        disabled={!taskId || loading === "priority"}
        variant="outline"
        className="w-full justify-start h-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 transition-all duration-200 group"
      >
        {loading === "priority" ? (
          <Loader2 className="h-4 w-4 mr-3 animate-spin text-blue-600" />
        ) : (
          <Sparkles className="h-4 w-4 mr-3 text-blue-600 group-hover:scale-110 transition-transform" />
        )}
        <div className="text-left">
          <div className="font-medium text-slate-900 dark:text-white">Suggest Priority</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">AI-powered prioritization</div>
        </div>
      </Button>
      
      <Button
        onClick={() => handleAction("summary")}
        disabled={loading === "summary"}
        variant="outline"
        className="w-full justify-start h-12 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-800/30 dark:hover:to-emerald-800/30 transition-all duration-200 group"
      >
        {loading === "summary" ? (
          <Loader2 className="h-4 w-4 mr-3 animate-spin text-green-600" />
        ) : (
          <Sparkles className="h-4 w-4 mr-3 text-green-600 group-hover:scale-110 transition-transform" />
        )}
        <div className="text-left">
          <div className="font-medium text-slate-900 dark:text-white">Daily Summary</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Get insights & progress</div>
        </div>
      </Button>
    </div>
  );
}
