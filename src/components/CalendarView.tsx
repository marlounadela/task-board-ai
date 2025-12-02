"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";

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

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onOpenNewTaskModal: (status: string, dueDate?: string) => void;
}

export function CalendarView({ tasks, onEditTask, onOpenNewTaskModal }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filter tasks that have due dates
  const tasksWithDueDates = useMemo(() => {
    return tasks.filter(task => task.dueDate);
  }, [tasks]);

  // Group tasks by their due date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    tasksWithDueDates.forEach(task => {
      if (task.dueDate) {
        // Normalize date to YYYY-MM-DD format
        const dateKey = task.dueDate.split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });

    return grouped;
  }, [tasksWithDueDates]);

  // Get calendar days for the current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Navigate months
  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  };

  // Get days remaining until due date
  const getDaysUntilDue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get priority color
  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 dark:bg-red-600';
      case 'medium':
        return 'bg-yellow-500 dark:bg-yellow-600';
      case 'low':
        return 'bg-green-500 dark:bg-green-600';
      default:
        return 'bg-slate-400 dark:bg-slate-500';
    }
  };

  // Week day headers
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Calendar Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-sm"
          >
            Today
          </Button>
        </div>

        {/* Task summary */}
        <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{tasksWithDueDates.length} tasks with due dates</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-6">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-slate-500 dark:text-slate-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const dayTasks = getTasksForDate(day);
            const hasTasksOnDay = dayTasks.length > 0;

            return (
              <div
                key={idx}
                className={`min-h-[100px] border rounded-lg p-2 transition-all group ${
                  isCurrentMonth
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
                } ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''} ${
                  hasTasksOnDay ? 'hover:border-blue-300 dark:hover:border-blue-600' : ''
                }`}
              >
                {/* Day number */}
                <div
                  className={`text-sm font-medium mb-1 ${
                    isCurrentMonth
                      ? isToday
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {format(day, 'd')}
                </div>

                {/* Tasks for this day */}
                <div className="space-y-1 overflow-y-auto max-h-[70px]">
                  {dayTasks.slice(0, 3).map((task) => {
                    const daysUntilDue = task.dueDate ? getDaysUntilDue(task.dueDate) : null;
                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                    const isDueToday = daysUntilDue === 0;

                    return (
                      <button
                        key={task.id}
                        onClick={() => onEditTask(task)}
                        className="w-full text-left p-1.5 rounded text-xs bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <div
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`}
                              />
                              <span className="font-medium text-slate-900 dark:text-white truncate">
                                {task.title}
                              </span>
                            </div>
                            {isOverdue && (
                              <div className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                <span className="text-[10px]">Overdue</span>
                              </div>
                            )}
                            {isDueToday && !isOverdue && (
                              <div className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                                <Clock className="h-3 w-3" />
                                <span className="text-[10px]">Due today</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 px-1.5">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>

                {/* Click to add task on this day */}
                {isCurrentMonth && (
                  <button
                    onClick={() => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      onOpenNewTaskModal('todo', dateStr);
                    }}
                    className="mt-1 w-full text-xs text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-center py-0.5"
                    title={`Add task for ${format(day, 'MMMM d, yyyy')}`}
                  >
                    + Add task
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center justify-center space-x-6 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-600" />
            <span>High Priority</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 dark:bg-yellow-600" />
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-600" />
            <span>Low Priority</span>
          </div>
        </div>
      </div>
    </div>
  );
}

