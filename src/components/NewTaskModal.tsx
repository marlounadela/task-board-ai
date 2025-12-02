"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { X, Calendar, User, Tag } from "lucide-react";
import { createNextCustomColumn } from "@/actions/board.actions";
import { getAllUsers } from "@/actions/user.actions";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: {
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate?: string;
    labels: string;
    company?: string;
    assigneeId?: string;
  }) => void;
  initialStatus?: string;
  initialDueDate?: string;
  columnLabels?: Record<string, string>; // Custom column labels { "todo": "To Do", ... }
  boardId?: string; // Needed to create custom column
}

const DEFAULT_STATUS_LABELS = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "review": "Review",
  "done": "Done"
};

export function NewTaskModal({ isOpen, onClose, onSubmit, initialStatus = "todo", initialDueDate, columnLabels, boardId }: NewTaskModalProps) {
  const statusLabels = columnLabels || DEFAULT_STATUS_LABELS;
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: initialStatus,
    priority: "medium",
    dueDate: initialDueDate || "",
    labels: "",
    company: "",
    assigneeId: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      let resolvedStatus = formData.status;
      // If user chose the special Custom option, create a new custom column and use its id
      if (formData.status === "custom") {
        if (!boardId) {
          throw new Error("Missing board context to create custom column");
        }
        const result = await createNextCustomColumn(boardId);
        resolvedStatus = result.statusId;
      }

      const taskData = {
        ...formData,
        status: resolvedStatus,
        dueDate: formData.dueDate || undefined,
        company: formData.company || undefined,
        assigneeId: formData.assigneeId || undefined
      };
      await onSubmit(taskData);
      onClose();
      // Reset form
      setFormData({
        title: "",
        description: "",
        status: initialStatus,
        priority: "medium",
        dueDate: initialDueDate || "",
        labels: "",
        company: "",
        assigneeId: ""
      });
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
      // Update formData when modal opens with new initial values
      setFormData(prev => ({
        ...prev,
        status: initialStatus,
        dueDate: initialDueDate || prev.dueDate || ""
      }));
    }
  }, [isOpen, initialStatus, initialDueDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Task</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)] scroll-smooth">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Task Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter task title..."
                className="w-full"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <WysiwygEditor
                value={formData.description}
                onChange={(value) => handleChange("description", value)}
                placeholder="Enter task description..."
                maxLength={500}
                className="w-full"
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  aria-label="Task status"
                >
                  <option value="todo">{statusLabels["todo"] || "To Do"}</option>
                  <option value="in-progress">{statusLabels["in-progress"] || "In Progress"}</option>
                  <option value="review">{statusLabels["review"] || "Review"}</option>
                  <option value="done">{statusLabels["done"] || "Done"}</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange("priority", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  aria-label="Task priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Due Date and Labels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400 w-5 h-5 pointer-events-none z-10" />
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange("dueDate", e.target.value)}
                    className="pl-11 pr-4 py-2.5 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors cursor-pointer font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Labels
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value={formData.labels}
                    onChange={(e) => handleChange("labels", e.target.value)}
                    placeholder="e.g., urgent, frontend, bug"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Company
              </label>
              <Input
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Enter company name..."
                className="w-full"
              />
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Assignee
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <select
                  value={formData.assigneeId}
                  onChange={(e) => handleChange("assigneeId", e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.title.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {isLoading ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
      </Card>
    </div>
  );
}
