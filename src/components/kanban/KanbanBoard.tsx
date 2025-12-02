"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { reorderTasks } from "@/actions/task.actions";
import { updateColumnLabels, deleteCustomColumn } from "@/actions/board.actions";
import { Filter, X } from "lucide-react";
import { Button } from "../ui/button";

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

interface KanbanBoardProps {
  boardId: string;
  initialTasks: Task[];
  columnLabels?: Record<string, string>; // Custom column labels { "todo": "To Do", ... }
  onTasksChange?: (tasks: Task[]) => void;
  onEditTask?: (task: Task) => void;
  onOpenNewTaskModal?: (status: string) => void;
  onBoardUpdate?: () => void;
  onColumnLabelsChange?: (labels: Record<string, string>) => void;
}

const DEFAULT_COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export function KanbanBoard({ boardId, initialTasks, columnLabels, onTasksChange, onEditTask, onOpenNewTaskModal, onBoardUpdate, onColumnLabelsChange }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentColumnLabels, setCurrentColumnLabels] = useState<Record<string, string>>(columnLabels || {});
  
  // Filter state
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Update column labels when prop changes
  useEffect(() => {
    if (columnLabels) {
      setCurrentColumnLabels(columnLabels);
    }
  }, [columnLabels]);

  // Compute dynamic columns: defaults + any custom columns from labels or tasks
  const columns = (() => {
    const defaultIds = DEFAULT_COLUMNS.map(c => c.id);
    const customIdsFromLabels = Object.keys(currentColumnLabels || {}).filter(id => !defaultIds.includes(id));
    const customIdsFromTasks = Array.from(new Set(tasks
      .map(t => t.status)
      .filter(id => !defaultIds.includes(id))));
    const customIdsSet = new Set<string>([...customIdsFromLabels, ...customIdsFromTasks]);
    // Sort custom columns: custom, custom-2, custom-3, others alpha
    const sortedCustom = Array.from(customIdsSet).sort((a, b) => {
      const ax = a.match(/^custom(?:-(\d+))?$/);
      const bx = b.match(/^custom(?:-(\d+))?$/);
      if (ax && bx) {
        const an = ax[1] ? parseInt(ax[1], 10) : 1;
        const bn = bx[1] ? parseInt(bx[1], 10) : 1;
        return an - bn;
      }
      if (ax) return -1;
      if (bx) return 1;
      return a.localeCompare(b);
    });
    const customColumns = sortedCustom.map(id => ({ id, title: currentColumnLabels[id] || (id === 'custom' ? 'Custom' : id.replace(/^custom-(\d+)$/, 'Custom $1')) }));
    return [...DEFAULT_COLUMNS, ...customColumns];
  })();

  // Get column title with fallback to defaults
  const getColumnTitle = (columnId: string) => {
    return currentColumnLabels[columnId] || DEFAULT_COLUMNS.find(c => c.id === columnId)?.title || (columnId === 'custom' ? 'Custom' : columnId.replace(/^custom-(\d+)$/, 'Custom $1')) || columnId;
  };

  // Handle column label update
  const handleColumnLabelUpdate = async (columnId: string, newLabel: string) => {
    try {
      await updateColumnLabels(boardId, columnId, newLabel);
      const updatedLabels = { ...currentColumnLabels, [columnId]: newLabel };
      setCurrentColumnLabels(updatedLabels);
      onColumnLabelsChange?.(updatedLabels);
      onBoardUpdate?.();
    } catch (error) {
      console.error("Error updating column label:", error);
    }
  };

  // Handle column deletion
  const handleColumnDelete = async (columnId: string) => {
    try {
      const result = await deleteCustomColumn(boardId, columnId);
      // Remove from current labels
      const updatedLabels = { ...currentColumnLabels };
      delete updatedLabels[columnId];
      setCurrentColumnLabels(updatedLabels);
      onColumnLabelsChange?.(updatedLabels);
      
      // Reload tasks to reflect moved tasks
      onBoardUpdate?.();
      
      // Show success message if tasks were moved
      if (result.movedTasksCount > 0) {
        alert(`Column deleted. ${result.movedTasksCount} task(s) moved to "To Do" column.`);
      }
    } catch (error) {
      console.error("Error deleting column:", error);
      alert(error instanceof Error ? error.message : "Failed to delete column");
    }
  };

  // Check if a column is a custom column
  const isCustomColumn = (columnId: string): boolean => {
    const defaultIds = DEFAULT_COLUMNS.map(c => c.id);
    return !defaultIds.includes(columnId);
  };

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastXRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const velocityHistoryRef = useRef<number[]>([]);

  // Update tasks when initialTasks change (for external task creation)
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Extract unique users and priorities from all tasks
  const uniqueAssignees = Array.from(
    new Map(
      initialTasks
        .filter((t) => t.assigneeId && t.assignee)
        .map((t) => [t.assigneeId!, t.assignee!])
    ).entries()
  ).map(([id, assignee]) => ({ id, ...assignee }));

  const uniquePriorities = Array.from(
    new Set(initialTasks.map((t) => t.priority).filter((p): p is string => !!p))
  ).sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.toLowerCase()] || 99) - (priorityOrder[b.toLowerCase()] || 99);
  });

  // Filter tasks based on selected filters (for display only)
  const displayTasks = useMemo(() => {
    if (!selectedAssigneeId && !selectedPriority) {
      return tasks;
    }
    
    return tasks.filter((task) => {
      // Match assignee filter
      let matchesAssignee = true;
      if (selectedAssigneeId) {
        if (selectedAssigneeId === "unassigned") {
          matchesAssignee = !task.assigneeId;
        } else {
          matchesAssignee = task.assigneeId === selectedAssigneeId;
        }
      }

      // Match priority filter
      const matchesPriority = !selectedPriority || task.priority === selectedPriority;
      
      return matchesAssignee && matchesPriority;
    });
  }, [tasks, selectedAssigneeId, selectedPriority]);
  
  // Count of filtered tasks for display
  const filteredTasksCount = useMemo(() => {
    if (!selectedAssigneeId && !selectedPriority) {
      return initialTasks.length;
    }
    return displayTasks.length;
  }, [displayTasks.length, initialTasks.length, selectedAssigneeId, selectedPriority]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    const overId = over.id as string;

    if (!activeTask) return;

    // Determine the column being hovered. `over.id` can be either a column id
    // (our droppable container id) or another task id when hovering a task.
    const isColumnId = columns.some((c) => c.id === overId);
    const overTask = isColumnId ? null : tasks.find((t) => t.id === overId) || null;
    const newStatus = isColumnId
      ? overId
      : overTask?.status || activeTask.status;

    const tasksInNewStatus = tasks.filter((t) => t.status === newStatus);
    const newPosition = tasksInNewStatus.length;

    // Update local state immediately for better UX
    const updatedTasks = tasks.map((t) =>
      t.id === activeTask.id ? { ...t, status: newStatus, position: newPosition } : t
    );
    setTasks(updatedTasks);
    
    // Notify parent component of the change
    onTasksChange?.(updatedTasks);

    // Try to update database, but don't let it break the UI
    try {
      await reorderTasks(boardId, activeTask.id, newStatus, newPosition);
      // Call onBoardUpdate to refresh board sorting
      onBoardUpdate?.();
    } catch {
      // Failed to reorder tasks
    }
    
    setActiveId(null);
  };

  const getTasksByStatus = (status: string) =>
    displayTasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  // Reset filters
  const clearFilters = () => {
    setSelectedAssigneeId(null);
    setSelectedPriority(null);
  };

  const hasActiveFilters = selectedAssigneeId !== null || selectedPriority !== null;

  // Ultra-smooth drag-to-scroll with advanced smartphone-like physics
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only enable drag scrolling if clicking on a non-interactive element
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, input, textarea, a, [role="button"]');
    
    if (isInteractive || !scrollContainerRef.current) return;
    
    // Cancel any ongoing momentum scroll
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    lastXRef.current = e.pageX;
    velocityRef.current = 0;
    velocityHistoryRef.current = [];
    lastTimeRef.current = performance.now();
    scrollContainerRef.current.style.userSelect = 'none';
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    const dx = e.pageX - lastXRef.current;
    
    // Calculate instant velocity with smooth averaging
    const instantVelocity = dt > 0 ? dx / dt : 0;
    
    // Maintain a history of recent velocities for smoother calculation
    velocityHistoryRef.current.push(instantVelocity);
    if (velocityHistoryRef.current.length > 5) {
      velocityHistoryRef.current.shift();
    }
    
    // Use averaged velocity from recent history for smoother momentum
    const avgVelocity = velocityHistoryRef.current.reduce((a, b) => a + b, 0) / velocityHistoryRef.current.length;
    velocityRef.current = avgVelocity;
    
    lastXRef.current = e.pageX;
    lastTimeRef.current = now;
    
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2.5; // Adjusted scroll speed multiplier for better sensitivity
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.userSelect = '';
    }
    
    // Apply ultra-smooth momentum scrolling with advanced physics
    if (Math.abs(velocityRef.current) > 0.08 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      // Enhanced momentum with variable friction for more realistic physics
      let momentum = velocityRef.current * 18; // Higher amplification for better momentum
      const initialMomentum = momentum;
      
      let lastFrameTime = performance.now();
      
      const animate = (currentTime: number) => {
        const deltaTime = currentTime - lastFrameTime;
        const frameMultiplier = Math.min(deltaTime / 16.67, 2); // 60fps baseline with cap
        
        // Check if we've reached scroll boundaries
        const currentScroll = container.scrollLeft;
        
        // Stop momentum when hitting boundaries with bounce effect
        if (currentScroll <= 0 && momentum < 0) {
          momentum *= 0.8; // Bounce effect
          if (Math.abs(momentum) < 0.5) momentum = 0;
        } else if (currentScroll >= maxScroll && momentum > 0) {
          momentum *= 0.8; // Bounce effect
          if (Math.abs(momentum) < 0.5) momentum = 0;
        }
        
        // Stop when momentum is too small
        if (Math.abs(momentum) < 0.05) {
          animationFrameRef.current = null;
          return;
        }
        
        // Variable friction for natural deceleration curve (ease-out effect)
        const progress = 1 - Math.abs(momentum) / Math.abs(initialMomentum);
        const friction = 0.915 + (progress * 0.05); // Progressive friction
        momentum *= friction;
        
        // Apply frame-rate independent scrolling with capped delta
        const delta = Math.max(-Math.abs(momentum), Math.min(Math.abs(momentum), momentum)) * frameMultiplier;
        container.scrollLeft -= delta;
        
        lastFrameTime = currentTime;
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    velocityRef.current = 0;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.userSelect = '';
    }
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative flex-1 flex flex-col">
        {/* Filter Bar - Single Row Layout */}
        <div className="mx-6 -mt-5 mb-5 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/95 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Filter Toggle Button */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 h-9 transition-all duration-200"
            >
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {hasActiveFilters && (
                <span className="ml-1 bg-blue-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                  {(selectedAssigneeId ? 1 : 0) + (selectedPriority ? 1 : 0)}
                </span>
              )}
            </Button>

            {/* Task Count */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {filteredTasksCount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">of</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {initialTasks.length}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">tasks</span>
              </div>
            )}

            {/* Filter Controls - Inline with toggle */}
            {showFilters && (
              <>
                {/* Assignee Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">
                    Assignee
                  </label>
                  <select
                    value={selectedAssigneeId || ""}
                    onChange={(e) => setSelectedAssigneeId(e.target.value || null)}
                    className="px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500 min-w-[160px]"
                  >
                    <option value="">All Users</option>
                    <option value="unassigned">Unassigned</option>
                    {uniqueAssignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name || "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">
                    Priority
                  </label>
                  <select
                    value={selectedPriority || ""}
                    onChange={(e) => setSelectedPriority(e.target.value || null)}
                    className="px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500 min-w-[140px]"
                  >
                    <option value="">All Priorities</option>
                    {uniquePriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Button */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-2 h-9 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className={`flex gap-6 h-full overflow-x-auto px-6 flex-1 kanban-board-container transition-colors duration-150 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {columns.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={getColumnTitle(column.id)}
              tasks={getTasksByStatus(column.id)}
              boardId={boardId}
              onOpenNewTaskModal={onOpenNewTaskModal}
              onEditTask={onEditTask}
              onColumnLabelUpdate={handleColumnLabelUpdate}
              onColumnDelete={handleColumnDelete}
              isCustomColumn={isCustomColumn(column.id)}
            />
          ))}
        </div>
        
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="transform rotate-3 scale-105">
            <TaskCard task={displayTasks.find((t) => t.id === activeId)!} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
