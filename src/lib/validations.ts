import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().optional(),
  // Allow default columns plus custom columns like: custom, custom-2, custom-3, ...
  status: z.union([
    z.enum(["todo", "in-progress", "review", "done"]),
    z.string().regex(/^custom(?:-\d+)?$/, {
      message: "Invalid custom status",
    }),
  ]),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.union([
    z.string().transform((str) => {
      if (!str || str.trim() === '') return null;
      // Handle YYYY-MM-DD format (HTML date input format)
      const dateStr = str.trim();
      
      // Parse YYYY-MM-DD and create as UTC midnight to avoid timezone shifts
      // This ensures the date stored represents the exact day without timezone conversion issues
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Create date as UTC midnight to prevent timezone shifts when storing
        const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        return isNaN(date.getTime()) ? null : date;
      }
      
      // Other formats - handle ISO strings by parsing and converting to UTC midnight
      let date: Date;
      if (dateStr.includes('T')) {
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr + 'T00:00:00Z'); // Explicitly UTC
      }
      
      if (isNaN(date.getTime())) return null;
      
      // Convert to UTC midnight of the same date to ensure consistency
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }),
    z.date(),
    z.null(),
    z.undefined()
  ]).optional(),
  labels: z.string().default(""),
  company: z.string().optional(),
  assigneeId: z.string().optional(),
});

export const subtaskSchema = z.object({
  title: z.string().min(1).max(100),
  taskId: z.string(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  taskId: z.string(),
});

export const timeEntrySchema = z.object({
  taskId: z.string(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  duration: z.number().int().positive(),
});
