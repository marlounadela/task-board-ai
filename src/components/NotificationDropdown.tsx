"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, CheckCheck, X, MessageSquare, UserPlus, Edit, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  ensureEmailVerificationNotification,
  type Notification as NotificationType,
} from "@/actions/notification.actions";
import { format } from "date-fns";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onNotificationRead?: () => void;
  onNotificationClick?: (notification: NotificationType) => void;
}

export function NotificationDropdown({ isOpen, onClose, buttonRef, onNotificationRead, onNotificationClick }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadUnreadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // loadNotifications and loadUnreadCount are stable functions, safe to omit

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, buttonRef]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Ensure email verification notification exists if needed
      await ensureEmailVerificationNotification();
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    console.log("[NotificationDropdown] Marking notification as read:", notificationId);
    
    try {
      await markNotificationAsRead(notificationId);
      console.log("[NotificationDropdown] Notification marked as read on server");
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      
      // Refresh count from server to ensure accuracy
      const freshCount = await getUnreadNotificationCount();
      console.log("[NotificationDropdown] Fresh unread count after mark one:", freshCount);
      setUnreadCount(freshCount);
      
      // Call parent callback to update badge
      if (onNotificationRead) {
        console.log("[NotificationDropdown] Calling onNotificationRead callback");
        onNotificationRead();
      } else {
        console.warn("[NotificationDropdown] onNotificationRead callback not provided");
      }
    } catch (error) {
      console.error("[NotificationDropdown] Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    console.log("[NotificationDropdown] handleMarkAllAsRead called");
    
    try {
      await markAllNotificationsAsRead();
      console.log("[NotificationDropdown] All notifications marked as read on server");
      
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      // Refresh count from server to ensure accuracy
      const freshCount = await getUnreadNotificationCount();
      console.log("[NotificationDropdown] Fresh unread count after mark all:", freshCount);
      setUnreadCount(freshCount);
      
      // Call parent callback to update badge
      if (onNotificationRead) {
        console.log("[NotificationDropdown] Calling onNotificationRead callback");
        onNotificationRead();
      } else {
        console.warn("[NotificationDropdown] onNotificationRead callback not provided");
      }
    } catch (error) {
      console.error("[NotificationDropdown] Error marking all notifications as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "mention":
        return <MessageSquare className="w-4 h-4" />;
      case "task_assigned":
        return <UserPlus className="w-4 h-4" />;
      case "board_edited":
        return <Edit className="w-4 h-4" />;
      case "email_verification":
        return <Mail className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const handleNotificationClick = async (notification: NotificationType, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Don't trigger if clicking on the mark-as-read button
    const target = e.target as HTMLElement;
    if (target.closest('button[data-mark-read]')) {
      return;
    }
    
    // Handle email verification notification
    if (notification.type === "email_verification") {
      try {
        const response = await fetch("/api/auth/send-verification-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          alert("Verification email has been sent! Please check your inbox and click the verification link to verify your email address.");
        } else {
          alert(data.error || "Failed to send verification email. Please try again later.");
        }
      } catch (error) {
        console.error("Error sending verification email:", error);
        alert("An error occurred while sending the verification email. Please try again later.");
      }
      return;
    }
    
    // Handle task-related notifications
    if (notification.taskId && onNotificationClick) {
      console.log("[NotificationDropdown] Notification clicked:", notification.id, notification.type);
      onNotificationClick(notification);
    }
  };

  if (!isOpen) return null;

  const buttonRect = buttonRef.current?.getBoundingClientRect();
  const position = buttonRect
    ? {
        top: buttonRect.bottom + 8,
        right: window.innerWidth - buttonRect.right,
      }
    : { top: 60, right: 20 };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed z-50 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700"
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
        maxHeight: "calc(100vh - 100px)",
      }}
      onClick={(e) => {
        // Prevent clicks inside dropdown from closing it
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Prevent mousedown from triggering click-outside handler
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log("[NotificationDropdown] Mark all read button clicked");
                await handleMarkAllAsRead(e);
              }}
              className="text-xs h-7 px-2"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-500 dark:text-slate-400">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Bell className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              No notifications yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                data-notification-item={notification.id}
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                  !notification.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                } ${notification.taskId || notification.type === "email_verification" ? "cursor-pointer" : ""}`}
                onClick={(e) => handleNotificationClick(notification, e)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex-shrink-0 ${
                      !notification.isRead
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        !notification.isRead
                          ? "font-medium text-slate-900 dark:text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {format(new Date(notification.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      data-mark-read
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleMarkAsRead(notification.id);
                      }}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(dropdownContent, document.body);
  }
  return dropdownContent;
}

