"use client";

import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CalendarView } from "@/components/CalendarView";
import { FloatingAiButton } from "@/components/FloatingAiButton";
import { AnalyticsView } from "@/components/AnalyticsView";
import { NewTaskModal } from "@/components/NewTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { EditProfileModal } from "@/components/EditProfileModal";
import { useState, useEffect, useRef } from "react";
import { Footer } from "@/components/Footer";
import { Plus, Search, Bell, Settings, User, Zap, BarChart3, Calendar, Users, TrendingUp, Shield, ChevronDown, Palette, Archive, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession, signOut } from "next-auth/react";
import { fetchAllTasksAction, searchTasks } from "@/actions/task.actions";
import { createTask } from "@/actions/task.actions";
import { getAllBoards } from "@/actions/board.actions";
import { archiveTask, unarchiveTask, getArchivedTasks } from "@/actions/task.actions";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAllUsers, getDatabaseStats } from "@/actions/user.actions";
import { getRecentActivities, type RecentActivity } from "@/actions/activity.actions";
import { getUnreadNotificationCount, markNotificationAsRead, ensureEmailVerificationNotification, type Notification as NotificationType } from "@/actions/notification.actions";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CommentsModal } from "@/components/CommentsModal";
import Link from "next/link";
import { ReconnectingEventSource } from "@/lib/eventSource";
import { requestDeduplication } from "@/lib/request-deduplication";


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

interface CreatedTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: Date;
  labels: string;
  company?: string;
  position: number;
  assigneeId?: string;
  boardId: string;
  assignee?: { name: string | null; id: string; email: string; image: string | null };
}


export default function Home() {
  const { data: session, status, update: updateSession } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>({});
  const [currentBoardId, setCurrentBoardId] = useState<string>("");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskInitialStatus, setNewTaskInitialStatus] = useState<string>("todo");
  const [newTaskInitialDueDate, setNewTaskInitialDueDate] = useState<string | undefined>(undefined);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showThemeSection, setShowThemeSection] = useState(false);
  const [showAdministratorSection, setShowAdministratorSection] = useState(false);
  const [showArchivedBoards, setShowArchivedBoards] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Array<{id: string; title: string; status: string; board: {id: string; name: string; columnLabels: string | null}; updatedAt: Date}>>([]);
  const [archivedBoardsCount, setArchivedBoardsCount] = useState(0);
  const [allUsers, setAllUsers] = useState<Array<{id: string; name: string | null; email: string; emailVerified: Date | null; createdAt: Date; updatedAt: Date; password: string | null; taskCount?: number; _count: {boards: number; assignedTasks: number; comments: number; timeEntries: number}}>>([]);
  const [boards, setBoards] = useState<Array<{id: string; name: string; createdAt: Date; updatedAt: Date; columnLabels?: string | null}>>([]);
  const [dbStats, setDbStats] = useState<{users: number; tasks: number; boards: number; comments: number} | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [currentView, setCurrentView] = useState<"kanban" | "calendar" | "analytics">("kanban");
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsModalTaskId, setCommentsModalTaskId] = useState<string | null>(null);
  const [commentsModalTaskTitle, setCommentsModalTaskTitle] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    boardName: string;
    boardId: string;
    assignee?: { name: string; image?: string };
  }>>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load unread notification count and check email verification
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        // Use request deduplication to prevent duplicate calls
        const count = await requestDeduplication.deduplicate(
          "getUnreadNotificationCount",
          () => getUnreadNotificationCount(),
          true
        );
        setUnreadNotificationCount(count);
      } catch (error) {
        console.error("Error loading unread notification count:", error);
      }
    };

    const checkEmailVerification = async () => {
      try {
        await requestDeduplication.deduplicate(
          "ensureEmailVerificationNotification",
          () => ensureEmailVerificationNotification(),
          false
        );
        // Refresh notification count after checking email verification
        await loadUnreadCount();
      } catch (error) {
        console.error("Error checking email verification:", error);
      }
    };

    if (status === "authenticated") {
      // Check email verification on initial load
      checkEmailVerification();
      
      // Refresh notification count every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
        // Also check email verification periodically (less frequently)
        // Only check every 5 minutes to reduce load
        if (Math.random() < 0.1) { // 10% chance per interval = ~5 minutes average
          checkEmailVerification();
        }
      }, 30000);
      
      // Subscribe to real-time notification events
      let es: ReconnectingEventSource | null = null;
      try {
        es = new ReconnectingEventSource({
          url: "/api/events",
          onMessage: (event) => {
            try {
              const eventData = JSON.parse(event.data);
              // Check if this notification is for the current user
              if (eventData.type === "notification_new") {
                const payload = eventData.payload as { userId?: string };
                // Refresh count if notification is for current user or if userId is not specified (broadcast)
                if (!payload?.userId || payload.userId === session?.user?.id) {
                  loadUnreadCount();
                }
              }
            } catch {
              // Ignore parse errors
            }
          },
          onError: () => {
            // Errors are handled by ReconnectingEventSource internally
          },
          maxReconnectAttempts: 10,
          initialReconnectDelay: 1000,
          maxReconnectDelay: 30000,
        });
      } catch (error) {
        console.error("Failed to create notification EventSource:", error);
      }
      
      return () => {
        clearInterval(interval);
        if (es) es.close();
      };
    }
  }, [status, session?.user?.id]);

  // Search functionality with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length === 0) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }

    if (searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchTasks(searchQuery.trim(), 10);
        setSearchSuggestions(results);
        setShowSearchSuggestions(results.length > 0);
      } catch (error) {
        console.error("Error searching tasks:", error);
        setSearchSuggestions([]);
        setShowSearchSuggestions(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle search suggestion selection
  const handleSearchSelect = (taskId: string, boardId: string) => {
    // Switch to the board containing the task
    if (boardId !== currentBoardId) {
      setCurrentBoardId(boardId);
    }
    
    // Clear search
    setSearchQuery("");
    setSearchSuggestions([]);
    setShowSearchSuggestions(false);
    
    // Scroll to task after a short delay to allow board to load
    setTimeout(() => {
      const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: "smooth", block: "center" });
        // Highlight the task briefly
        taskElement.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
        setTimeout(() => {
          taskElement.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
        }, 2000);
      }
    }, 500);
  };

  // Close dropdowns when clicking outside (notification dropdown has its own handler)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close notification dropdown here - it has its own handler
      if (!target.closest('[data-dropdown]') && !target.closest('[data-notification-dropdown]') && !target.closest('[data-search]')) {
        setShowSettingsDropdown(false);
        setShowUserDropdown(false);
        // Don't close notification dropdown from here
      }
      // Close search suggestions when clicking outside
      if (!target.closest('[data-search]')) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for profile updates and refresh session data immediately
  useEffect(() => {
    const handleProfileUpdated = (e: Event) => {
      try {
        const custom = e as CustomEvent<{ userId?: string; name?: string; email?: string }>;
        if (custom.detail?.userId && (custom.detail.name || custom.detail.email)) {
          setTasks(prev => prev.map(t => {
            if (t.assigneeId !== custom.detail!.userId) return t;
            const newName = custom.detail!.name || t.assignee?.name || "";
            return {
              ...t,
              assignee: t.assignee ? { ...t.assignee, name: newName } : { name: newName },
            };
          }));
        }
        void updateSession();
      } catch {}
    };
    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('profile-updated', handleProfileUpdated);
  }, [updateSession]);

  useEffect(() => {
    // Load and subscribe to realtime activity updates when authenticated
    if (status !== "authenticated") {
      setActivities([]);
      return;
    }

    let isCancelled = false;
    let es: ReconnectingEventSource | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let isRefreshing = false;
    let pendingRefresh = false;
    let lastRefreshTime = 0;

    const refresh = async (force = false) => {
      if (isCancelled) return;
      
      // If already refreshing, mark that we need another refresh after this one
      if (isRefreshing) {
        pendingRefresh = true;
        return;
      }
      
      // Throttle refreshes to at most once per 500ms unless forced
      const now = Date.now();
      if (!force && now - lastRefreshTime < 500) {
        pendingRefresh = true;
        return;
      }
      
      isRefreshing = true;
      pendingRefresh = false;
      lastRefreshTime = now;
      
      try {
        // Add a small delay to ensure database commits are visible
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (isCancelled) return;
        
        // Use request deduplication to prevent duplicate calls
        const items = await requestDeduplication.deduplicate(
          "getRecentActivities",
          () => getRecentActivities(50),
          false // Don't use cache for activities (they change frequently)
        );
        if (!isCancelled) {
          setActivities(items);
        }
      } catch (err) {
        const message = (err as Error)?.message || "";
        if (message.includes("Unauthorized") || message === "USER_DELETED") {
          if (!isCancelled) {
            setActivities([]);
            await signOut();
          }
        } else if (!isCancelled) {
          setActivities([]);
        }
      } finally {
        isRefreshing = false;
        
        // If a refresh was requested while we were refreshing, do it now
        if (pendingRefresh && !isCancelled) {
          pendingRefresh = false;
          // Use setTimeout to avoid stack overflow
          setTimeout(() => {
            if (!isCancelled) {
              void refresh(true);
            }
          }, 100);
        }
      }
    };

    const scheduleRefresh = (immediate = false) => {
      if (isCancelled) return;
      
      // Clear existing timer to reset debounce
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      
      // For activity_new events, refresh more immediately
      const delay = immediate ? 250 : 400;
      
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void refresh(true);
      }, delay);
    };

    // Initial load
    void refresh(true);

    // Set up periodic polling as a reliable fallback (every 2 seconds)
    // This ensures activities update even if EventSource fails or misses events
    pollInterval = setInterval(() => {
      if (!isCancelled && !isRefreshing) {
        void refresh(false);
      }
    }, 2000);

    try {
      es = new ReconnectingEventSource({
        url: "/api/events",
        onMessage: (event) => {
          // Parse the event data to check if it's an activity event
          try {
            const eventData = JSON.parse(event.data);
            if (process.env.NODE_ENV === "development") {
              console.debug("[Activities] Received event:", eventData.type, eventData);
            }
            
            // Refresh activities for activity_new events (most important) or any activity-related events
            if (eventData.type === "activity_new") {
              // For activity_new events, refresh immediately since we know an activity was just created
              if (process.env.NODE_ENV === "development") {
                console.debug("[Activities] Scheduling immediate refresh for activity_new event");
              }
              scheduleRefresh(true);
            } else if (
                eventData.type === "task_created" || 
                eventData.type === "task_updated" || 
                eventData.type === "task_deleted" || 
                eventData.type === "status_changed" ||
                eventData.type === "comment_added" ||
                eventData.type === "profile_updated") {
              // For other events, use normal debounce (activity_new will also fire from these)
              if (process.env.NODE_ENV === "development") {
                console.debug("[Activities] Scheduling refresh for event:", eventData.type);
              }
              scheduleRefresh(true); // Changed to true to be more responsive
            }
          } catch (parseError) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[Activities] Failed to parse event data:", event.data, parseError);
            }
            // If parsing fails, refresh anyway to be safe
            scheduleRefresh(true);
          }
        },
        onError: (error) => {
          // Errors are handled by ReconnectingEventSource internally
          if (process.env.NODE_ENV === "development") {
            console.debug("[Activities] EventSource error:", error);
          }
        },
        onOpen: () => {
          if (process.env.NODE_ENV === "development") {
            console.debug("[Activities] EventSource connected");
          }
          // Refresh activities when connection is established to ensure we have latest
          if (!isCancelled) {
            scheduleRefresh(true);
          }
        },
        maxReconnectAttempts: 10,
        initialReconnectDelay: 1000,
        maxReconnectDelay: 30000,
      });
    } catch (error) {
      console.error("[Activities] Failed to create EventSource:", error);
      // Polling will continue as fallback
    }

    return () => {
      isCancelled = true;
      if (es) es.close();
      if (refreshTimer) clearTimeout(refreshTimer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [status]);
  
  // Load all tasks and column labels
  useEffect(() => {
    // Only load tasks and boards when authenticated
    if (status !== "authenticated") {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadAllTasks = async () => {
      try {
        setIsLoading(true);
        // Use request deduplication to prevent duplicate calls
        const [fetchedTasks, fetchedBoards] = await Promise.all([
          requestDeduplication.deduplicate(
            "fetchAllTasks",
            () => fetchAllTasksAction(),
            true
          ),
          requestDeduplication.deduplicate(
            "getAllBoards",
            () => getAllBoards(),
            true
          ),
        ]);
        
        if (!isMounted) return;
        
        setTasks(fetchedTasks);
        setBoards(fetchedBoards);
        if (fetchedBoards.length > 0) {
          // If no current board is set, or current board doesn't exist in list, set to first board
          if (!currentBoardId || !fetchedBoards.find(b => b.id === currentBoardId)) {
            setCurrentBoardId(fetchedBoards[0].id);
            if (fetchedBoards[0].columnLabels) {
              try {
                const labels = JSON.parse(fetchedBoards[0].columnLabels);
                setColumnLabels(labels);
              } catch {
                setColumnLabels({});
              }
            }
          } else {
            // Update column labels for current board
            const currentBoard = fetchedBoards.find(b => b.id === currentBoardId);
            if (currentBoard?.columnLabels) {
              try {
                const labels = JSON.parse(currentBoard.columnLabels);
                setColumnLabels(labels);
              } catch {
                setColumnLabels({});
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading tasks:", error);
        if (isMounted) {
          setTasks([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial load
    loadAllTasks();

    return () => {
      isMounted = false;
    };

    // Subscribe to SSE to refresh tasks on changes
    let es: ReconnectingEventSource | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let isRefreshing = false;
    const scheduleRefresh = () => {
      if (refreshTimer || isRefreshing) return;
      refreshTimer = setTimeout(async () => {
        refreshTimer = null;
        if (isRefreshing) return;
        isRefreshing = true;
        try {
          // Use request deduplication to prevent duplicate calls
          const fetched = await requestDeduplication.deduplicate(
            "fetchAllTasks",
            () => fetchAllTasksAction(),
            false // Don't use cache for refresh operations
          );
          setTasks(fetched);
        } catch {}
        isRefreshing = false;
      }, 250);
    };
    try {
      es = new ReconnectingEventSource({
        url: "/api/events",
        onMessage: (event) => {
          scheduleRefresh();
          // Reload boards when board-related events occur
          try {
            const eventData = JSON.parse(event.data);
            if (eventData.type === "board_updated" || eventData.type === "board_created" || eventData.type === "board_archived" || eventData.type === "board_deleted") {
              requestDeduplication.deduplicate(
                "getAllBoards",
                () => getAllBoards(),
                false // Don't use cache for board updates
              ).then(fetchedBoards => {
                setBoards(fetchedBoards);
                
                // Handle board deletion - switch to another board if current board was deleted
                if (eventData.type === "board_deleted" && eventData.payload?.boardId === currentBoardId) {
                  if (fetchedBoards.length > 0) {
                    // Switch to the first available board
                    setCurrentBoardId(fetchedBoards[0].id);
                    if (fetchedBoards[0].columnLabels) {
                      try {
                        const labels = JSON.parse(fetchedBoards[0].columnLabels);
                        setColumnLabels(labels);
                      } catch {
                        setColumnLabels({});
                      }
                    } else {
                      setColumnLabels({});
                    }
                  } else {
                    // No boards left, clear current board
                    setCurrentBoardId("");
                    setColumnLabels({});
                  }
                }
                
                // Update current board if it was updated
                if (eventData.type === "board_updated" && eventData.payload?.boardId === currentBoardId) {
                  const updatedBoard = fetchedBoards.find(b => b.id === currentBoardId);
                  if (updatedBoard?.columnLabels) {
                    try {
                      const labels = JSON.parse(updatedBoard.columnLabels);
                      setColumnLabels(labels);
                    } catch {
                      setColumnLabels({});
                    }
                  }
                }
                
                // For board_created, ensure the new board is available in the list
                // The getAllBoards() call above already includes it, so we just need to ensure
                // column labels are set if we're viewing the newly created board
                if (eventData.type === "board_created" && eventData.payload?.boardId) {
                  const newBoard = fetchedBoards.find(b => b.id === eventData.payload.boardId);
                  if (newBoard && newBoard.id === currentBoardId) {
                    if (newBoard.columnLabels) {
                      try {
                        const labels = JSON.parse(newBoard.columnLabels);
                        setColumnLabels(labels);
                      } catch {
                        setColumnLabels({});
                      }
                    }
                  }
                }
              }).catch(() => {});
            }
          } catch {
            // Ignore parse errors
          }
        },
        onError: (error) => {
          // Errors are handled by ReconnectingEventSource internally
          console.debug("EventSource error:", error);
        },
        onOpen: () => {
          console.debug("EventSource connected");
        },
        maxReconnectAttempts: 10,
        initialReconnectDelay: 1000,
        maxReconnectDelay: 30000,
      });
      // Also set up periodic polling as a reliable fallback (every 2 seconds)
      pollInterval = setInterval(async () => {
        if (isRefreshing) return;
        isRefreshing = true;
        try {
          // Use request deduplication to prevent duplicate calls
          const fetched = await requestDeduplication.deduplicate(
            "fetchAllTasks",
            () => fetchAllTasksAction(),
            false // Don't use cache for polling
          );
          setTasks(fetched);
        } catch {}
        isRefreshing = false;
      }, 2000);
    } catch (error) {
      console.error("Failed to create EventSource:", error);
    }

    return () => {
      if (es) es.close();
      if (refreshTimer) clearTimeout(refreshTimer);
      if (pollInterval) clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  
  // Load archived tasks count
  useEffect(() => {
    const loadArchivedCount = async () => {
      try {
        // Use request deduplication to prevent duplicate calls
        const tasks = await requestDeduplication.deduplicate(
          "getArchivedTasks",
          () => getArchivedTasks(),
          true
        );
        setArchivedBoardsCount(tasks.length);
      } catch {
        // Error loading archived tasks
      }
    };

    if (status === "authenticated") {
      loadArchivedCount();
    }
  }, [status]);

  // Load user statistics on mount
  useEffect(() => {
    if (status === "authenticated") {
      void loadAdministratorData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);


  // Render welcome hero whenever not authenticated (includes loading state)
  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
        <section className="relative overflow-hidden min-h-screen">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-purple-900/50"></div>
          <nav className="relative z-10 px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Task Board AI</span>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="ghost" className="text-white hover:bg-white/10">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">Get Started</Button>
                </Link>
              </div>
            </div>
          </nav>
          <div className="relative z-10 px-6 py-20 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Boost Your Productivity with
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> AI-Powered</span>
                <br />Task Management
              </h1>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">Modern, sleek task management platform that combines intuitive design with AI assistance to help you and your team achieve more.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Link href="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-4 text-lg shadow-2xl hover:shadow-purple-500/25 transition-all duration-300">Start Free Trial</Button>
                </Link>
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg">Watch Demo</Button>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent my-10"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">AI-Powered</h3>
                  <p className="text-slate-300">Smart task suggestions, priority optimization, and automated summaries powered by AI.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Team Collaboration</h3>
                  <p className="text-slate-300">Seamless collaboration with real-time updates, comments, and shared workspaces.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Analytics & Insights</h3>
                  <p className="text-slate-300">Track progress, identify bottlenecks, and optimize workflows with detailed analytics.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative z-10 px-6 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-white mb-2">10K+</div>
                  <div className="text-slate-300">Active Users</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">50K+</div>
                  <div className="text-slate-300">Tasks Completed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">99.9%</div>
                  <div className="text-slate-300">Uptime</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">4.9★</div>
                  <div className="text-slate-300">User Rating</div>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-purple-700/40 to-transparent"></div>
        </section>
        <Footer variant="hero" />
      </div>
    );
  }

  const handleAiGenerate = async (type: "subtasks" | "priority" | "summary") => {
    void type;
  };



  const revalidateBoards = async () => {
    try {
      // Reload all tasks when boards are updated
      const fetchedTasks = await fetchAllTasksAction();
      setTasks(fetchedTasks);
      // Refresh user statistics to update task counts
      await loadAdministratorData();
    } catch {
      // Error revalidating tasks
    }
  };
  

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditTaskModal(true);
  };

  const handleNotificationClick = async (notification: NotificationType) => {
    console.log("[NotificationClick] Handling notification click:", notification);
    
    if (!notification.taskId) {
      console.log("[NotificationClick] No taskId in notification");
      return; // No task associated with this notification
    }

    // Find the task in the tasks array
    let task = tasks.find(t => t.id === notification.taskId);
    if (!task) {
      console.log("[NotificationClick] Task not found in current tasks, reloading...");
      // Try to reload tasks if not found
      try {
        const fetchedTasks = await fetchAllTasksAction();
        setTasks(fetchedTasks);
        task = fetchedTasks.find(t => t.id === notification.taskId);
        if (!task) {
          console.error("[NotificationClick] Task still not found after reload:", notification.taskId);
          alert(`Task "${notification.taskId}" not found. It may have been deleted.`);
          return;
        }
        console.log("[NotificationClick] Task found after reload:", task.title);
      } catch (error) {
        console.error("[NotificationClick] Error reloading tasks:", error);
        alert("Failed to load task. Please try again.");
        return;
      }
    }

    await navigateToTask(task, notification);
  };

  const navigateToTask = async (task: Task, notification: NotificationType) => {
    console.log("[NotificationClick] Navigating to task:", task.id, "type:", notification.type);
    
    // Switch to kanban view to see the task in context
    setCurrentView("kanban");

    // Switch to the board containing this task if not already on it
    if (task.boardId !== currentBoardId) {
      setCurrentBoardId(task.boardId);
      
      // Update column labels for the new board
      const board = boards.find(b => b.id === task.boardId);
      if (board?.columnLabels) {
        try {
          const labels = JSON.parse(board.columnLabels);
          setColumnLabels(labels);
        } catch {
          setColumnLabels({});
        }
      } else {
        setColumnLabels({});
      }
    }

    // Mark notification as read if not already read
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        // Refresh unread count
        const count = await getUnreadNotificationCount();
        setUnreadNotificationCount(count);
      } catch (error) {
        console.error("[NotificationClick] Error marking notification as read:", error);
      }
    }

    // Close the notification dropdown
    setShowNotificationDropdown(false);

    // Small delay to ensure dropdown closes before opening modal
    await new Promise(resolve => setTimeout(resolve, 100));

    // For mention notifications, open CommentsModal to see the comment where user was mentioned
    // For other notification types, open EditTaskModal
    if (notification.type === "mention") {
      console.log("[NotificationClick] Opening CommentsModal for mention");
      setCommentsModalTaskId(task.id);
      setCommentsModalTaskTitle(task.title);
      setShowCommentsModal(true);
    } else {
      console.log("[NotificationClick] Opening EditTaskModal");
      // Open the task edit modal
      handleEditTask(task);
    }
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    setShowEditTaskModal(false);
    setEditingTask(null);
    // Reload all tasks to update the display
    revalidateBoards();
  };

  const handleOpenNewTaskModal = (status: string, dueDate?: string) => {
    setNewTaskInitialStatus(status);
    setNewTaskInitialDueDate(dueDate);
    setShowNewTaskModal(true);
  };

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate?: string;
    labels: string;
    company?: string;
    assigneeId?: string;
  }) => {
    try {
      const boards = await getAllBoards();
      if (boards.length === 0) {
        throw new Error("No boards available");
      }
      
      const boardId = boards[0].id;
      const createdTask = await createTask(boardId, taskData) as CreatedTask;
      
      if (createdTask) {
        // Just reload all tasks instead of manually adding
        await revalidateBoards();
        // Reload column labels after potential custom column creation
        const refreshedBoards = await getAllBoards();
        if (refreshedBoards.length > 0) {
          setCurrentBoardId(refreshedBoards[0].id);
          if (refreshedBoards[0].columnLabels) {
            try {
              const labels = JSON.parse(refreshedBoards[0].columnLabels);
              setColumnLabels(labels);
            } catch {
              setColumnLabels({});
            }
          }
        }
      }
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  };


  const handleArchiveTask = async (taskId: string) => {
    if (isArchiving) return;
    
    setIsArchiving(true);
    try {
      await archiveTask(taskId);
      // Remove the archived task from view
      setTasks(prev => prev.filter(task => task.id !== taskId));
      // Update archived count
      const archives = await getArchivedTasks();
      setArchivedBoardsCount(archives.length);
      // Reload all tasks to update the display
      const fetchedTasks = await fetchAllTasksAction();
      setTasks(fetchedTasks);
    } catch {
      // Error archiving task
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchiveTask = async (taskId: string) => {
    try {
      await unarchiveTask(taskId);
      const tasks = await getArchivedTasks();
      setArchivedTasks(tasks);
      setArchivedBoardsCount(tasks.length);
      revalidateBoards();
    } catch {
      // Error unarchiving task
    }
  };

  const handleRefreshArchivedBoards = async () => {
    const tasks = await getArchivedTasks();
    setArchivedTasks(tasks);
    setArchivedBoardsCount(tasks.length);
  };

  const loadAdministratorData = async () => {
    try {
      // Use request deduplication to prevent duplicate calls
      const [users, stats] = await Promise.all([
        requestDeduplication.deduplicate(
          "getAllUsers",
          () => getAllUsers(),
          true
        ),
        requestDeduplication.deduplicate(
          "getDatabaseStats",
          () => getDatabaseStats(),
          true
        )
      ]);
      setAllUsers(users);
      setDbStats(stats);
    } catch (error) {
      console.error("Error loading administrator data:", error);
      setAllUsers([]);
      setDbStats(null);
    }
  };


  // Filter tasks by current board
  const currentBoardTasks = tasks.filter(t => t.boardId === currentBoardId);
  const inProgressTasks = currentBoardTasks.filter(t => t.status === "in-progress").length;
  const completedTasks = currentBoardTasks.filter(t => t.status === "done").length;
  const todoTasks = currentBoardTasks.filter(t => t.status === "todo").length;

  // Get user task statistics
  const userTaskStats = allUsers.length > 0 
    ? allUsers.map(user => ({
        userName: user.name || user.email || `User_${user.id.slice(0, 8)}`,
        taskCount: user.taskCount || 0
      }))
    : [];
  
  const totalBoards = boards.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/60 flex-shrink-0">
        <div className="max-w-laptop-lg mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.location.reload()}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    TaskBoard AI
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Intelligent task management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative hidden md:block" data-search>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input 
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length >= 2) {
                      setShowSearchSuggestions(true);
                    }
                  }}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSearchSuggestions(true);
                    }
                  }}
                  placeholder="Search tasks..." 
                  className="pl-10 w-64 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20"
                />
                <SearchSuggestions
                  suggestions={searchSuggestions}
                  isOpen={showSearchSuggestions && searchQuery.trim().length >= 2}
                  onSelect={handleSearchSelect}
                  onClose={() => setShowSearchSuggestions(false)}
                  searchQuery={searchQuery}
                />
              </div>
              
              {/* Action Buttons */}
              <Button 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={() => setShowNewTaskModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
              
              <Button
                ref={notificationButtonRef}
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  setShowNotificationDropdown(!showNotificationDropdown);
                  setShowSettingsDropdown(false);
                  setShowUserDropdown(false);
                }}
                data-notification-dropdown
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>
                  </span>
                )}
              </Button>
              <NotificationDropdown
                isOpen={showNotificationDropdown}
                onClose={() => setShowNotificationDropdown(false)}
                buttonRef={notificationButtonRef}
                onNotificationRead={async () => {
                  console.log("[Page] onNotificationRead callback triggered");
                  // Refresh unread count when notifications are marked as read
                  try {
                    const count = await getUnreadNotificationCount();
                    console.log("[Page] Refreshing unread count to:", count);
                    setUnreadNotificationCount(count);
                    console.log("[Page] Unread count updated in state:", count);
                  } catch (error) {
                    console.error("[Page] Error refreshing unread count:", error);
                  }
                }}
                onNotificationClick={handleNotificationClick}
              />
              
              <div className="relative" data-dropdown>
                <button 
                  onClick={() => {
                    setShowSettingsDropdown(!showSettingsDropdown);
                    setShowUserDropdown(false);
                  }}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {showSettingsDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 animate-fade-in-up">
                    {/* Theme Section */}
                    <div>
                      <button
                        onClick={() => setShowThemeSection(!showThemeSection)}
                        className="w-full px-3 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Palette className="w-4 h-4" />
                          <span>Theme</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showThemeSection ? 'transform rotate-180' : ''}`} />
                      </button>
                      {showThemeSection && (
                        <div className="px-3 pb-3">
                          <ThemeToggle />
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <button
                          onClick={async () => {
                            const newValue = !showAdministratorSection;
                            setShowAdministratorSection(newValue);
                            if (newValue && allUsers.length === 0) {
                              await loadAdministratorData();
                            }
                          }}
                          className="w-full px-3 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4" />
                            <span>Administrator</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showAdministratorSection ? 'transform rotate-180' : ''}`} />
                        </button>
                        {showAdministratorSection && (
                          <div className="px-3 pb-3 space-y-3">
                            {/* Database Stats */}
                            {dbStats && (
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg space-y-2">
                                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Database Statistics</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Users:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{dbStats.users}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Tasks:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{dbStats.tasks}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Boards:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{dbStats.boards}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Comments:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{dbStats.comments}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Users List */}
                            {allUsers.length > 0 && (
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Registered Users ({allUsers.length})</h4>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                  {allUsers.map((user) => (
                                    <div key={user.id} className="text-xs p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                      <div className="font-medium text-slate-900 dark:text-white">{user.name || 'No name'}</div>
                                      <div className="text-slate-500 dark:text-slate-400">{user.email}</div>
                                      <div className="flex justify-between text-slate-400 dark:text-slate-500 mt-1">
                                        <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                                        {user.password && <span className="text-green-600 dark:text-green-400">● Has password</span>}
                                      </div>
                                      <div className="flex gap-2 mt-1 text-slate-400 dark:text-slate-500">
                                        <span>Boards: {user._count.boards}</span>
                                        <span>Tasks: {user._count.assignedTasks}</span>
                                        <span>Comments: {user._count.comments}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative" data-dropdown>
                <button 
                  onClick={() => {
                    setShowUserDropdown(!showUserDropdown);
                    setShowSettingsDropdown(false);
                  }}
                  className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center hover:from-slate-500 hover:to-slate-700 transition-all duration-200"
                  title="User menu"
                  aria-label="User menu"
                >
                  <User className="w-4 h-4 text-white" />
                </button>
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 animate-fade-in-up">
                    <div className="p-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {session.user?.name || session.user?.email}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {session.user?.email}
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => {
                          setShowProfileModal(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={async () => {
                          const tasks = await getArchivedTasks();
                          setArchivedTasks(tasks);
                          setShowArchivedBoards(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Archive className="w-4 h-4" />
                          <span>Archived Tasks</span>
                        </div>
                        {archivedBoardsCount > 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                            {archivedBoardsCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => signOut()}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-laptop-lg mx-auto px-6 py-8">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-full">
          {/* Kanban Board */}
          <div className="xl:col-span-3 flex flex-col min-h-0">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Project Dashboard</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your tasks with drag & drop</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={currentView === "kanban" ? "default" : "outline"} 
                    size="sm" 
                    className={currentView === "kanban" ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0" : "border-slate-200 dark:border-slate-700"}
                    onClick={() => setCurrentView("kanban")}
                  >
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Kanban
                  </Button>
                  <Button 
                    variant={currentView === "calendar" ? "default" : "outline"} 
                    size="sm" 
                    className={currentView === "calendar" ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0" : "border-slate-200 dark:border-slate-700"}
                    onClick={() => setCurrentView("calendar")}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Calendar View
                  </Button>
                  <Button 
                    variant={currentView === "analytics" ? "default" : "outline"}
                    size="sm" 
                    className={currentView === "analytics" ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0" : "border-slate-200 dark:border-slate-700"}
                    onClick={() => setCurrentView("analytics")}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </div>
              </div>
            </div>
            
            
            <div className="flex-1 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-slate-500">Loading tasks...</div>
                </div>
              ) : currentView === "kanban" ? (
                <KanbanBoard 
                  boardId={currentBoardId} 
                  initialTasks={currentBoardTasks}
                  columnLabels={columnLabels}
                  onTasksChange={(updatedTasks) => {
                    // Update tasks for the current board
                    setTasks(prev => [
                      ...prev.filter(t => t.boardId !== currentBoardId),
                      ...updatedTasks
                    ]);
                  }}
                  onEditTask={handleEditTask}
                  onOpenNewTaskModal={handleOpenNewTaskModal}
                  onBoardUpdate={async () => {
                    await revalidateBoards();
                    // Reload boards and column labels after board update
                    const fetchedBoards = await getAllBoards();
                    setBoards(fetchedBoards);
                    const currentBoard = fetchedBoards.find(b => b.id === currentBoardId);
                    if (currentBoard && 'columnLabels' in currentBoard && currentBoard.columnLabels) {
                      try {
                        const labels = JSON.parse(currentBoard.columnLabels as string);
                        setColumnLabels(labels);
                      } catch {
                        setColumnLabels({});
                      }
                    }
                  }}
                  onColumnLabelsChange={(labels) => setColumnLabels(labels)}
                />
              ) : currentView === "calendar" ? (
                <CalendarView 
                  tasks={tasks}
                  onEditTask={handleEditTask}
                  onOpenNewTaskModal={handleOpenNewTaskModal}
                />
              ) : (
                <AnalyticsView tasks={tasks} columnLabels={columnLabels} />
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalBoards}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total Boards</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{inProgressTasks}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{completedTasks}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{todoTasks}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">To Do</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Task Statistics */}
              {userTaskStats.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Tasks per User
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {userTaskStats.map((stat, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {stat.userName}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {stat.taskCount} Tasks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Recent Activities</h3>
                  <div className="space-y-3 max-h-[20rem] overflow-y-auto pr-1">
                    {activities.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity yet.</p>
                    )}
                    {activities.map(a => {
                      const color =
                        a.type === 'task_created' ? 'bg-blue-500' :
                        a.type === 'task_deleted' ? 'bg-red-500' :
                        a.type === 'task_archived' ? 'bg-violet-500' :
                        a.type === 'task_unarchived' ? 'bg-emerald-500' :
                        a.type === 'status_changed' ? 'bg-orange-500' :
                        a.type === 'comment_added' ? 'bg-green-500' :
                        a.type === 'board_created' ? 'bg-blue-600' :
                        a.type === 'board_archived' ? 'bg-purple-500' :
                        a.type === 'board_unarchived' ? 'bg-indigo-500' :
                        a.type === 'board_deleted' ? 'bg-red-600' :
                        a.type === 'column_created' ? 'bg-teal-500' :
                        a.type === 'column_deleted' ? 'bg-rose-500' :
                        'bg-slate-400';
                      return (
                        <div key={a.id} className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${color}`}></div>
                          <div className="flex items-center gap-2">
                            {a.user?.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.user.image} alt="" className="w-5 h-5 rounded-full" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            )}
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              <p>
                                <span className="font-medium text-slate-900 dark:text-white">{a.user?.name ?? a.user?.email}</span>
                                {` `}
                                {a.message}
                                {a.task?.title && (
                                  <>
                                    {` - `}
                                    <span className="font-medium text-slate-900 dark:text-white">{a.task.title}</span>
                                  </>
                                )}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500">
                                {new Date(a.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      <EditProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      <Footer />

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={() => {
          setShowNewTaskModal(false);
          setNewTaskInitialDueDate(undefined);
        }}
        onSubmit={handleCreateTask}
        initialStatus={newTaskInitialStatus}
        initialDueDate={newTaskInitialDueDate}
        columnLabels={columnLabels}
        boardId={currentBoardId}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={showEditTaskModal}
        onClose={() => {
          setShowEditTaskModal(false);
          setEditingTask(null);
        }}
        task={editingTask}
        onTaskUpdated={handleTaskUpdated}
        onArchive={handleArchiveTask}
        columnLabels={columnLabels}
      />

      {/* Comments Modal */}
      {commentsModalTaskId && (
        <CommentsModal
          taskId={commentsModalTaskId}
          taskTitle={commentsModalTaskTitle}
          isOpen={showCommentsModal}
          onClose={() => {
            setShowCommentsModal(false);
            setCommentsModalTaskId(null);
            setCommentsModalTaskTitle("");
          }}
        />
      )}

      {/* Floating AI Button */}
      <FloatingAiButton
        taskId={undefined}
        onGenerate={handleAiGenerate}
      />

      {/* Archived Boards Modal */}
      {showArchivedBoards && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Archive className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Archived Tasks</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowArchivedBoards(false);
                  handleRefreshArchivedBoards();
                }}
              >
                <span className="sr-only">Close</span>
                ×
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {archivedTasks.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">No archived tasks</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {archivedTasks.map((task) => {
                    // Get column labels from the task's board
                    const defaultLabels = {
                      "todo": "To Do",
                      "in-progress": "In Progress",
                      "review": "Review",
                      "done": "Done"
                    };
                    
                    let boardLabels: Record<string, string> = { ...defaultLabels };
                    if (task.board.columnLabels) {
                      try {
                        const parsed = JSON.parse(task.board.columnLabels);
                        // Merge with defaults so custom labels override but defaults remain available
                        boardLabels = { ...defaultLabels, ...parsed };
                      } catch {
                        // If parsing fails, use defaults only
                        boardLabels = defaultLabels;
                      }
                    }
                    
                    // Resolve status label with fallback
                    const getStatusLabel = (status: string): string => {
                      if (boardLabels[status]) {
                        return boardLabels[status];
                      }
                      // Fallback for custom statuses
                      if (status.startsWith('custom')) {
                        return status === 'custom' ? 'Custom' : status.replace(/^custom-(\d+)$/, 'Custom $1');
                      }
                      return defaultLabels[status as keyof typeof defaultLabels] || status;
                    };
                    
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-slate-900 dark:text-white">{task.title}</h3>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                              {getStatusLabel(task.status)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Archived on {new Date(task.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await handleUnarchiveTask(task.id);
                            handleRefreshArchivedBoards();
                          }}
                        >
                          Restore
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
