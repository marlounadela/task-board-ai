"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, MessageSquare } from "lucide-react";
import { AiPanel } from "./AiPanel";

interface FloatingAiButtonProps {
  taskId?: string;
  onGenerate: (type: "subtasks" | "priority" | "summary") => Promise<void>;
}

export function FloatingAiButton({ taskId, onGenerate }: FloatingAiButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating AI Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          size="icon"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Sparkles className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* AI Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="fixed bottom-24 right-6 w-80 max-w-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">AI Assistant</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Smart task management</p>
                </div>
              </div>
              
              <AiPanel 
                taskId={taskId}
                onGenerate={onGenerate}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
