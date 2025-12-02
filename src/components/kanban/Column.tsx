"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  labels: string;
  company?: string;
  position: number;
  commentsCount?: number;
  assignee?: { name: string; image?: string };
  boardId: string;
  createdAt?: string;
}

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  boardId: string;
  onOpenNewTaskModal?: (status: string) => void;
  onEditTask?: (task: Task) => void;
  onColumnLabelUpdate?: (columnId: string, newLabel: string) => void;
  onColumnDelete?: (columnId: string) => void;
  isCustomColumn?: boolean; // Whether this is a custom column (can be deleted)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Column({ id, title, tasks, boardId: _boardId, onOpenNewTaskModal, onEditTask, onColumnLabelUpdate, onColumnDelete, isCustomColumn = false }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update edit value when title changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(title);
    }
  }, [title, isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditValue(title);
  };

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== title) {
      onColumnLabelUpdate?.(id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const getColumnColor = (id: string) => {
    switch (id) {
      case 'todo':
        return 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50';
      case 'in-progress':
        return 'border-orange-200 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/20';
      case 'review':
        return 'border-purple-200 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/20';
      case 'done':
        return 'border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20';
      default:
        return 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50';
    }
  };

  const getColumnIcon = (id: string) => {
    switch (id) {
      case 'todo':
        return '⭕';
      case 'in-progress':
        return '🔄';
      case 'review':
        return '👀';
      case 'done':
        return '✅';
      default:
        return '📋';
    }
  };

  return (
    <div className={`flex-1 min-w-[320px] max-w-[400px] rounded-2xl border-2 ${getColumnColor(id)} backdrop-blur-sm transition-all duration-300 hover:shadow-lg flex flex-col h-full kanban-column`}>
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{getColumnIcon(id)}</span>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <Input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-7 text-lg font-bold px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                    onBlur={handleSave}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:bg-green-100 dark:hover:bg-green-900/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave();
                    }}
                  >
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel();
                    }}
                  >
                    <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 group">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {title}
                  </h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/60 dark:hover:bg-slate-700/60"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick();
                    }}
                    title="Edit column name"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {isCustomColumn && onColumnDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete column "${title}"? Tasks in this column will be moved to "To Do".`)) {
                          onColumnDelete(id);
                        }
                      }}
                      title="Delete column"
                    >
                      <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                    </Button>
                  )}
                </div>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              </p>
            </div>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all duration-200 flex-shrink-0"
            onClick={() => onOpenNewTaskModal?.(id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 px-6 pb-6">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div 
            ref={setNodeRef} 
            className={`space-y-3 min-h-[400px] transition-all duration-200 overflow-y-auto ${
              tasks.length >= 5 ? 'kanban-column-task-list' : ''
            }`}
          >
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-500">
                <button 
                  onClick={() => onOpenNewTaskModal?.(id)}
                  className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                  title="Add new task"
                  aria-label="Add new task"
                >
                  <Plus className="w-6 h-6" />
                </button>
                <p className="text-sm">Drop tasks here</p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEditTask} />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
