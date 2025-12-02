"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar, MessageCircle, Edit2 } from "lucide-react";
import { useState } from "react";
import { CommentsModal } from "../CommentsModal";

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

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onEdit?: (task: Task) => void;
}

// Utility function to strip HTML tags and get plain text
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

// Utility function to calculate days remaining or overdue
const getDaysRemaining = (dueDate?: string): number | null => {
  if (!dueDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays; // Positive = days remaining, Negative = days overdue
};

// Utility function for better text truncation
const truncateText = (text: string, maxLength: number): string => {
  // Strip HTML tags first to get plain text for display
  const plainText = stripHtmlTags(text);
  if (plainText.length <= maxLength) return plainText;
  
  // Find the last space before the max length to avoid cutting words
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  // If we found a space and it's not too far from the end, use it
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  // Otherwise, just cut at the max length
  return truncated + '...';
};

export function TaskCard({ task, isDragging, onEdit }: TaskCardProps) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState<number>(task.commentsCount || 0);
  
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-700';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
  };

  const daysRemaining = getDaysRemaining(task.dueDate);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isCommentsOpen ? {} : listeners)}
      data-task-id={task.id}
      className="group cursor-grab active:cursor-grabbing bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all duration-200"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {truncateText(task.title, 50)}
            </h4>
            {task.title.length > 50 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {task.title.length} characters
              </p>
            )}
          </div>
          {task.priority && (
            <Badge
              className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}
            >
              {task.priority}
            </Badge>
          )}
        </div>
        
        {task.description && task.description.trim() && (
          <div className="mb-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {truncateText(task.description, 120)}
            </p>
            {stripHtmlTags(task.description).length > 120 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {stripHtmlTags(task.description).length} characters
              </p>
            )}
          </div>
        )}
        
        {task.labels && task.labels.trim() && (
          <div className="flex flex-wrap gap-1 mb-4">
            {task.labels.split(',').map((label: string, index: number) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
              >
                {label.trim()}
              </Badge>
            ))}
          </div>
        )}

        {task.company && task.company.trim() && (
          <div className="mb-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md inline-block">
              <span className="font-medium">Company:</span> {task.company}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-wrap gap-1">
            {task.dueDate && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                daysRemaining !== null && daysRemaining < 0
                  ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
                  : daysRemaining !== null && daysRemaining <= 3
                  ? 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700'
                  : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700'
              }`}>
                <Calendar className="h-3 w-3" />
                {daysRemaining !== null && (
                  <span className="font-semibold">
                    {daysRemaining < 0 
                      ? `${Math.abs(daysRemaining)} days overdue`
                      : daysRemaining === 0
                      ? "Due today"
                      : `${daysRemaining} days left`
                    }
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(task);
              }}
              className="h-6 px-2 py-1 text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 flex items-center gap-1"
              title="Edit Task"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsCommentsOpen(true);
              }}
              className="h-6 px-2 py-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1"
              title="Comments"
            >
              <MessageCircle className="h-3 w-3" />
              {localCommentsCount > 0 && (
                <span className="text-xs font-medium">{localCommentsCount}</span>
              )}
            </Button>
            
            <div className="relative group/avatar">
              {task.assignee ? (
                <Avatar className="h-6 w-6 ring-2 ring-white dark:ring-slate-800 cursor-pointer group-hover/avatar:scale-105 transition-transform duration-200">
                  <AvatarImage src={task.assignee.image} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {task.assignee.name?.[0]}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-6 w-6 ring-2 ring-white dark:ring-slate-800 cursor-pointer rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center group-hover/avatar:scale-105 transition-transform duration-200">
                  <span className="text-xs text-slate-500 dark:text-slate-400">?</span>
                </div>
              )}
              
              {/* Tooltip - only shows on hover of the avatar */}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible transition-all duration-300 z-[100] whitespace-nowrap pointer-events-none">
                <div className="font-medium">{task.assignee?.name || "Unassigned"}</div>
                <div className="text-slate-300 text-xs">
                  {task.assignee?.name ? "Assigned" : "No assignee"}
                </div>
                
                {/* Arrow pointing down */}
                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-slate-700"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CommentsModal
        taskId={task.id}
        taskTitle={task.title}
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        onCommentAdded={() => setLocalCommentsCount((c) => c + 1)}
        onCommentDeleted={() => setLocalCommentsCount((c) => Math.max(0, c - 1))}
      />
    </Card>
  );
}
