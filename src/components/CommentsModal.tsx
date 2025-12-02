"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Send, MessageCircle, User, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { createComment, getComments, deleteComment } from "@/actions/comments.actions";
import { getAllUsers } from "@/actions/user.actions";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// Shape returned by the server (Prisma include)
interface ServerComment {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  taskId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface CommentsModalProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

export function CommentsModal({ taskId, taskTitle, isOpen, onClose, onCommentAdded, onCommentDeleted }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionsDropdownRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedComments = await getComments(taskId) as ServerComment[];
      const normalized: Comment[] = fetchedComments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: new Date(c.createdAt),
        user: {
          id: c.user.id,
          name: c.user.name ?? null,
          email: c.user.email ?? null,
          image: c.user.image ?? null,
        },
      }));
      setComments(normalized);
    } catch {
      // Error loading comments
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen) {
      loadComments();
      loadUsers();
    }
  }, [isOpen, loadComments]);

  const loadUsers = async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email
      })));
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleCommentChange = (value: string) => {
    setNewComment(value);

    // Check for @mention - match @ followed by optional text until space, comma, or end
    const cursorPosition = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/@([^\s,@]*)$/);

    if (match) {
      const query = match[1].toLowerCase();
      setMentionQuery(query);
      
      // Get position of @ symbol
      const atIndex = textBeforeCursor.lastIndexOf('@');
      setMentionPosition({ start: atIndex, end: cursorPosition });
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const getFilteredUsers = () => {
    if (!mentionQuery) {
      return allUsers.slice(0, 10); // Limit to 10 users when no query
    }
    const query = mentionQuery.toLowerCase();
    return allUsers
      .filter(user => {
        const name = (user.name || "").toLowerCase();
        const email = user.email.toLowerCase();
        return name.includes(query) || email.includes(query);
      })
      .slice(0, 10);
  };

  const insertMention = (user: UserOption) => {
    const beforeMention = newComment.substring(0, mentionPosition.start);
    const afterMention = newComment.substring(mentionPosition.end);
    // Use name if available, otherwise use email username (part before @)
    // Remove only spaces, keep underscores and hyphens for better matching
    const mentionText = user.name 
      ? user.name.replace(/\s+/g, '') // Remove spaces from name for easier matching (keep underscores/hyphens)
      : user.email.split('@')[0]; // Use email username part
    const newText = `${beforeMention}@${mentionText} ${afterMention}`;
    
    setNewComment(newText);
    setShowMentions(false);
    setMentionQuery("");

    // Set cursor position after the mention
    setTimeout(() => {
      const newCursorPos = beforeMention.length + mentionText.length + 2; // +2 for @ and space
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions) {
      const filteredUsers = getFilteredUsers();
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredUsers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredUsers[mentionIndex]) {
          insertMention(filteredUsers[mentionIndex]);
        }
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const comment = await createComment({
        content: newComment.trim(),
        taskId,
      });
      
      setComments(prev => [...prev, comment]);
      setNewComment("");
      onCommentAdded?.();
      console.log("[CommentsModal] Comment created successfully:", comment.id);
    } catch (error) {
      console.error("[CommentsModal] Error creating comment:", error);
      alert("Failed to create comment. Please check the console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      onCommentDeleted?.();
    } catch {
      // Error deleting comment
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Comments
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {taskTitle}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-500 dark:text-slate-400">Loading comments...</div>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                No comments yet. Be the first to add a comment!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id} className="p-4 bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.image ?? undefined} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {comment.user.name?.[0] || comment.user.email?.[0] || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {comment.user.name || comment.user.email}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <form
            onSubmit={handleSubmitComment}
            className="flex gap-3"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newComment}
                onChange={(e) => handleCommentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Delay hiding mentions to allow clicking on them
                  setTimeout(() => {
                    if (!mentionsDropdownRef.current?.contains(document.activeElement)) {
                      setShowMentions(false);
                    }
                  }, 200);
                }}
                placeholder="Add a comment... (Type @ to mention someone)"
                className="flex-1"
                disabled={isSubmitting}
              />
              {showMentions && (
                <div
                  ref={mentionsDropdownRef}
                  className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                >
                  {getFilteredUsers().length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
                      No users found
                    </div>
                  ) : (
                    getFilteredUsers().map((user, index) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => insertMention(user)}
                        className={`w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 ${
                          index === mentionIndex ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                        onMouseEnter={() => setMentionIndex(index)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {(user.name || user.email)[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {user.name || "No name"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                          </div>
                        </div>
                        <AtSign className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  // Render into body to avoid being inside draggable card
  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
