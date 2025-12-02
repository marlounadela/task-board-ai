"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { WysiwygEditor } from "./WysiwygEditor";
import { X, Calendar, User, Tag, AlertCircle, Archive, Clock } from "lucide-react";
import { updateTask } from "@/actions/task.actions";
import { getAllUsers } from "@/actions/user.actions";
import { format } from "date-fns";

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
  assigneeId?: string;
  boardId: string;
  createdAt?: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated: (updatedTask: Task) => void;
  onArchive?: (taskId: string) => void;
  columnLabels?: Record<string, string>; // Custom column labels { "todo": "To Do", ... }
}

const DEFAULT_STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const DESCRIPTION_MAX_LENGTH = 500;

// Helper function to format date to YYYY-MM-DD for date input
const formatDateForInput = (dateValue: string | Date | undefined | null): string => {
  if (!dateValue) return "";
  
  try {
    let date: Date;
    
    if (dateValue instanceof Date) {
      // Already a Date object
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      // String format - handle both ISO and YYYY-MM-DD
      if (dateValue.includes('T')) {
        // ISO format (e.g., "2025-10-29T00:00:00.000Z")
        date = new Date(dateValue);
      } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format - treat as UTC to match database storage
        const [year, month, day] = dateValue.split('-').map(Number);
        date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
        // Fallback - try standard parsing
        date = new Date(dateValue);
      }
    } else {
      return "";
    }
    
    if (isNaN(date.getTime())) {
      return "";
    }
    
    // Format as YYYY-MM-DD using UTC date components to match database storage
    // Since dates are stored as UTC midnight, we use UTC components for consistency
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    // If parsing fails, try to extract YYYY-MM-DD from string
    if (typeof dateValue === 'string') {
      const match = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : "";
    }
    return "";
  }
};

// Utility function to calculate days remaining or overdue
const getDaysRemaining = (dueDate?: string): number | null => {
  if (!dueDate) return null;
  
  try {
    // Get today at UTC midnight for consistent comparison
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    
    // Parse YYYY-MM-DD format as UTC to match database storage
    let due: Date;
    if (dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD format - parse as UTC date
      const [year, month, day] = dueDate.split('-').map(Number);
      due = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
      // Other formats (ISO string, etc.) - parse and convert to UTC midnight
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        return null;
      }
      const year = parsedDate.getUTCFullYear();
      const month = parsedDate.getUTCMonth();
      const day = parsedDate.getUTCDate();
      due = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
    
    if (isNaN(due.getTime())) {
      return null;
    }
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays; // Positive = days remaining, Negative = days overdue
  } catch {
    return null;
  }
};

export function EditTaskModal({ isOpen, onClose, task, onTaskUpdated, onArchive, columnLabels }: EditTaskModalProps) {
  // Build status options: defaults + custom columns (memoized to prevent unnecessary re-renders)
  const statusOptions = useMemo(() => {
    const defaultOptions = columnLabels 
      ? [
          { value: "todo", label: columnLabels["todo"] || "To Do" },
          { value: "in-progress", label: columnLabels["in-progress"] || "In Progress" },
          { value: "review", label: columnLabels["review"] || "Review" },
          { value: "done", label: columnLabels["done"] || "Done" },
        ]
      : DEFAULT_STATUS_OPTIONS;
    
    // Add custom columns from columnLabels
    if (columnLabels) {
      const defaultIds = ["todo", "in-progress", "review", "done"];
      const customColumns = Object.keys(columnLabels)
        .filter(id => !defaultIds.includes(id))
        .map(id => ({
          value: id,
          label: columnLabels[id] || (id === 'custom' ? 'Custom' : id.replace(/^custom-(\d+)$/, 'Custom $1'))
        }))
        .sort((a, b) => {
          // Sort custom columns: custom, custom-2, custom-3, others alpha
          const ax = a.value.match(/^custom(?:-(\d+))?$/);
          const bx = b.value.match(/^custom(?:-(\d+))?$/);
          if (ax && bx) {
            const an = ax[1] ? parseInt(ax[1], 10) : 1;
            const bn = bx[1] ? parseInt(bx[1], 10) : 1;
            return an - bn;
          }
          if (ax) return -1;
          if (bx) return 1;
          return a.value.localeCompare(b.value);
        });
      
      return [...defaultOptions, ...customColumns];
    }
    
    return defaultOptions;
  }, [columnLabels]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    labels: "",
    company: "",
    assigneeId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  // Track the current task ID to prevent unnecessary form resets during editing
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    // Only initialize/reset form when:
    // 1. Modal opens with a task (isOpen becomes true)
    // 2. Task ID changes (editing a different task)
    // This prevents resetting while user is actively editing the date picker
    if (task && isOpen) {
      const taskIdChanged = task.id !== currentTaskId;
      
      if (taskIdChanged || !currentTaskId) {
        // Check if task's current status is valid (exists in statusOptions)
        // If not (e.g., column was deleted), fallback to "todo"
        const validStatus = statusOptions.find(opt => opt.value === task.status);
        const safeStatus = validStatus ? task.status : "todo";
        
        // Format dueDate for the date input (YYYY-MM-DD)
        const formattedDueDate = formatDateForInput(task.dueDate);
        
        setFormData({
          title: task.title || "",
          description: task.description || "",
          status: safeStatus,
          priority: task.priority || "medium",
          dueDate: formattedDueDate,
          labels: task.labels || "",
          company: task.company || "",
          assigneeId: task.assigneeId || "",
        });
        setErrors({});
        setCurrentTaskId(task.id);
      }
    } else if (!isOpen) {
      // Reset task ID when modal closes
      setCurrentTaskId(null);
    }
  }, [task, isOpen, statusOptions, currentTaskId]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    // Check character count for HTML content (strip HTML tags)
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = formData.description;
    const textContent = tempDiv.textContent || "";
    
    if (textContent.length > DESCRIPTION_MAX_LENGTH) {
      newErrors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleArchiveClick = () => {
    setShowConfirmArchive(true);
  };

  const handleConfirmArchive = async () => {
    if (!task?.id || !onArchive || isArchiving) return;
    
    setIsArchiving(true);
    try {
      // Archive the task by its ID
      await onArchive(task.id);
      setShowConfirmArchive(false);
      onClose();
    } catch {
      // Error archiving task
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !task) return;
    
    setIsLoading(true);
    try {
      // Send dueDate as string (validation schema will handle conversion)
      // Empty string becomes null to properly clear the date
      const dueDateValue = formData.dueDate && formData.dueDate.trim() 
        ? formData.dueDate.trim() 
        : null;

      const updatedTask = await updateTask(task.id, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        dueDate: dueDateValue,
        labels: formData.labels.trim(),
        company: formData.company.trim() || undefined,
        assigneeId: formData.assigneeId || undefined,
      });
      
      if (updatedTask) {
        // Format dueDate to YYYY-MM-DD using the helper function
        // updatedTask.dueDate might be a Date object or null
        const formattedDueDate = updatedTask.dueDate 
          ? formatDateForInput(updatedTask.dueDate instanceof Date ? updatedTask.dueDate : new Date(updatedTask.dueDate))
          : undefined;
        
        onTaskUpdated({
          ...task,
          title: updatedTask.title,
          description: updatedTask.description || "",
          status: updatedTask.status,
          priority: updatedTask.priority || "medium",
          dueDate: formattedDueDate,
          labels: updatedTask.labels || "",
          company: updatedTask.company || undefined,
          assigneeId: updatedTask.assigneeId || undefined,
          createdAt: updatedTask.createdAt ? updatedTask.createdAt.toISOString() : task.createdAt,
        });
        onClose();
      } else {
        // Still update the UI even if database update failed
        onTaskUpdated({
          ...task,
          title: formData.title.trim(),
          description: formData.description.trim() || "",
          status: formData.status,
          priority: formData.priority,
          dueDate: formData.dueDate || undefined,
          labels: formData.labels.trim(),
          company: formData.company.trim() || undefined,
          assigneeId: formData.assigneeId || undefined,
        });
        onClose();
      }
    } catch {
      // Still update the UI even if database update failed
      onTaskUpdated({
        ...task,
        title: formData.title.trim(),
        description: formData.description.trim() || "",
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        labels: formData.labels.trim(),
        company: formData.company.trim() || undefined,
        assigneeId: formData.assigneeId || undefined,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Task</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update task details and information</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Task Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter task title..."
              className={`w-full ${errors.title ? "border-red-500 focus:border-red-500" : ""}`}
            />
            {errors.title && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </Label>
            <WysiwygEditor
              value={formData.description}
              onChange={(value) => handleChange("description", value)}
              placeholder="Enter task description..."
              maxLength={DESCRIPTION_MAX_LENGTH}
              className="w-full"
              error={!!errors.description}
            />
            {errors.description && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                aria-label="Task status"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Priority
              </Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                aria-label="Task priority"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date and Labels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Due Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400 w-5 h-5 pointer-events-none z-0" />
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleChange("dueDate", e.target.value);
                  }}
                  onFocus={(e) => e.stopPropagation()}
                  className="w-full pl-11 pr-4 py-2.5 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors cursor-pointer font-medium text-slate-900 dark:text-white relative z-10"
                  disabled={isLoading}
                />
              </div>
              {formData.dueDate && (
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  {(() => {
                    const daysRemaining = getDaysRemaining(formData.dueDate);
                    if (daysRemaining === null) return null;
                    if (daysRemaining < 0) {
                      return <span className="text-red-600 dark:text-red-400">{`${Math.abs(daysRemaining)} days overdue`}</span>;
                    }
                    if (daysRemaining === 0) {
                      return <span className="text-orange-600 dark:text-orange-400">Due today</span>;
                    }
                    return <span>{`${daysRemaining} days left`}</span>;
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="labels" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Labels
              </Label>
              <Input
                id="labels"
                value={formData.labels}
                onChange={(e) => handleChange("labels", e.target.value)}
                placeholder="Enter labels (comma-separated)..."
                className="w-full"
              />
            </div>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Company
            </Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange("company", e.target.value)}
              placeholder="Enter company name..."
              className="w-full"
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Assignee
            </Label>
            <select
              id="assignee"
              value={formData.assigneeId || ""}
              onChange={(e) => handleChange("assigneeId", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              aria-label="Task assignee"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Created Date - Read-only */}
          {task.createdAt && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Created Date
              </Label>
              <div className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                {format(new Date(task.createdAt), "MMMM dd, yyyy 'at' h:mm a")}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={handleArchiveClick}
              disabled={isLoading || !onArchive}
              className="border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive Task
            </Button>
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {isLoading ? "Updating..." : "Update Task"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Archive Confirmation Modal */}
      {showConfirmArchive && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Archive Task?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Confirm archiving this task
                  </p>
                </div>
              </div>
              
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                This task will be moved to your archived tasks. You can restore it later if needed.
              </p>
              
              <div className="flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmArchive(false)}
                  disabled={isArchiving}
                  className="border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmArchive}
                  disabled={isArchiving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isArchiving ? "Archiving..." : "Archive Task"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
