"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar, BarChart3, PieChart, TrendingUp } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  createdAt?: string;
  assignee?: { name?: string };
};

type Props = {
  tasks: Task[];
  columnLabels?: Record<string, string>;
};

const DEFAULT_STATUS_ORDER = ["todo", "in-progress", "review", "done"] as const;
const DEFAULT_STATUS_COLORS: Record<string, string> = {
  "todo": "#94a3b8",
  "in-progress": "#fb923c",
  "review": "#a78bfa",
  "done": "#34d399",
};

const PRIORITY_ORDER = ["low", "medium", "high", "urgent"] as const;
const PRIORITY_COLORS: Record<string, string> = {
  "low": "#60a5fa",
  "medium": "#22c55e",
  "high": "#f59e0b",
  "urgent": "#ef4444",
};

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(days: number | "all") {
  if (days === "all") return null;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start: formatDateISO(start), end: formatDateISO(end) };
}

export function AnalyticsView({ tasks, columnLabels }: Props) {
  const [range, setRange] = useState<7 | 30 | 90 | "all">(30);

  // Build dynamic status list: defaults + labels + any statuses present in tasks
  const dynamicStatuses = useMemo(() => {
    const defaults = [...DEFAULT_STATUS_ORDER] as readonly string[];
    const fromLabels = Object.keys(columnLabels || {}).filter((k) => !defaults.includes(k));
    const fromTasks = Array.from(new Set(tasks.map((t) => t.status))).filter((k) => !defaults.includes(k));
    const set = new Set<string>([...defaults, ...fromLabels, ...fromTasks]);

    // Sort customs: custom, custom-2, custom-3 in numeric order, keep unknowns alpha after customs
    const customs = Array.from(set).filter((s) => /^custom(?:-(\d+))?$/.test(s) && !defaults.includes(s));
    const others = Array.from(set).filter((s) => !defaults.includes(s) && !/^custom(?:-(\d+))?$/.test(s));

    const sortedCustoms = customs.sort((a, b) => {
      const an = a === "custom" ? 1 : parseInt(a.split("-")[1] || "1", 10);
      const bn = b === "custom" ? 1 : parseInt(b.split("-")[1] || "1", 10);
      return an - bn;
    });

    return [...defaults, ...sortedCustoms, ...others.sort()];
  }, [tasks, columnLabels]);

  // Provide colors for dynamic statuses (cycle through palette for customs/others)
  const statusColor = (status: string): string => {
    if (status in DEFAULT_STATUS_COLORS) return DEFAULT_STATUS_COLORS[status];
    const palette = [
      "#14b8a6", // teal
      "#f472b6", // pink
      "#f59e0b", // amber
      "#60a5fa", // blue
      "#ef4444", // red
      "#22c55e", // green
      "#8b5cf6", // violet
      "#06b6d4", // cyan
    ];
    // Try to extract numeric suffix for stable assignment
    const m = status.match(/custom(?:-(\d+))?/);
    if (m) {
      const n = m[1] ? parseInt(m[1], 10) : 1;
      return palette[(n - 1) % palette.length];
    }
    // Fallback hash
    let hash = 0;
    for (let i = 0; i < status.length; i++) hash = (hash * 31 + status.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  };

  const filteredTasks = useMemo(() => {
    const r = getDateRange(range);
    if (!r) return tasks;
    return tasks.filter((t) => {
      if (!t.createdAt) return false;
      const d = t.createdAt.slice(0, 10);
      return d >= r.start && d <= r.end;
    });
  }, [tasks, range]);

  const totals = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const s of dynamicStatuses) byStatus[s] = 0;
    for (const p of PRIORITY_ORDER) byPriority[p] = 0;

    filteredTasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      const p = (t.priority || "medium").toLowerCase();
      byPriority[p] = (byPriority[p] || 0) + 1;
    });

    const total = filteredTasks.length;
    const completed = byStatus["done"] || 0;
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, byStatus, byPriority, completion };
  }, [filteredTasks, dynamicStatuses]);

  const trendData = useMemo(() => {
    // Build daily buckets for the selected range
    const r = getDateRange(range);
    const buckets: Record<string, number> = {};
    if (r) {
      const start = new Date(r.start);
      const end = new Date(r.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        buckets[formatDateISO(d)] = 0;
      }
    } else {
      // If all time, create buckets from min to max date inside tasks (limit to 120 days to keep light)
      const dates = filteredTasks
        .map((t) => t.createdAt?.slice(0, 10))
        .filter(Boolean) as string[];
      if (dates.length === 0) return [] as Array<{ x: string; y: number }>;
      const min = dates.reduce((a, b) => (a < b ? a : b));
      const max = dates.reduce((a, b) => (a > b ? a : b));
      const start = new Date(min);
      const end = new Date(max);
      let steps = 0;
      for (let d = new Date(start); d <= end && steps < 120; d.setDate(d.getDate() + 1), steps++) {
        buckets[formatDateISO(d)] = 0;
      }
    }

    filteredTasks.forEach((t) => {
      const d = t.createdAt?.slice(0, 10);
      if (d && d in buckets) buckets[d] += 1;
    });

    return Object.entries(buckets).map(([x, y]) => ({ x, y }));
  }, [filteredTasks, range]);

  const maxBar = Math.max(1, ...dynamicStatuses.map((s) => totals.byStatus[s] || 0));
  const maxTrend = Math.max(1, ...trendData.map((p) => p.y));

  // Show default statuses first; custom/extra are accessible by scrolling
  const defaultStatuses = useMemo(() => DEFAULT_STATUS_ORDER.slice(), []);
  const extraStatuses = useMemo(
    () => dynamicStatuses.filter((s) => !(DEFAULT_STATUS_ORDER as readonly string[]).includes(s)),
    [dynamicStatuses]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Analytics</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Insights based on tasks and statuses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={range === 7 ? "default" : "outline"} size="sm" onClick={() => setRange(7)}>7d</Button>
          <Button variant={range === 30 ? "default" : "outline"} size="sm" onClick={() => setRange(30)}>30d</Button>
          <Button variant={range === 90 ? "default" : "outline"} size="sm" onClick={() => setRange(90)}>90d</Button>
          <Button variant={range === "all" ? "default" : "outline"} size="sm" onClick={() => setRange("all")}>All</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Across selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.completed}</div>
            <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                style={{ width: `${totals.completion}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{totals.completion}% completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active Day</CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No data</div>
            ) : (
              (() => {
                const peak = trendData.reduce((a, b) => (a.y >= b.y ? a : b));
                return (
                  <>
                    <div className="text-2xl font-bold">{peak.y}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">on {peak.x}</p>
                  </>
                );
              })()
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Priority</CardTitle>
            <PieChart className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {(() => {
              const entries = Object.entries(totals.byPriority);
              if (entries.length === 0) return <div className="text-sm text-slate-500 dark:text-slate-400">No data</div>;
              const top = entries.sort((a, b) => b[1] - a[1])[0];
              return (
                <>
                  <div className="text-2xl font-bold capitalize">{top[0]}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{top[1]} tasks</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tasks Created Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {/* Lightweight SVG line chart */}
              {trendData.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">No data in selected range</div>
              ) : (
                <svg viewBox="0 0 400 160" className="w-full h-full">
                  <defs>
                    <linearGradient id="line" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const stepX = 400 / Math.max(1, trendData.length - 1);
                    const points = trendData.map((p, i) => {
                      const x = i * stepX;
                      const y = 150 - (p.y / maxTrend) * 140; // padding
                      return `${x},${y}`;
                    });
                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="url(#line)"
                          strokeWidth="3"
                          points={points.join(" ")}
                        />
                        {trendData.map((p, i) => {
                          const x = i * stepX;
                          const y = 150 - (p.y / maxTrend) * 140;
                          return <circle key={i} cx={x} cy={y} r={2} fill="#60a5fa" />;
                        })}
                      </>
                    );
                  })()}
                </svg>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 thin-scrollbar">
              {/* Defaults always visible at top */}
              {defaultStatuses.map((s) => {
                const label = columnLabels?.[s]
                  || (s === "in-progress" ? "In Progress"
                    : s === "todo" ? "To Do"
                    : s.charAt(0).toUpperCase() + s.slice(1));
                return (
                  <div key={s} className="grid grid-cols-5 items-center gap-3">
                    <div className="col-span-2 text-xs text-slate-600 dark:text-slate-300">
                      {label}
                    </div>
                    <div className="col-span-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.round(((totals.byStatus[s] || 0) / maxBar) * 100)}%`,
                          backgroundColor: statusColor(s),
                        }}
                      />
                    </div>
                    <div className="col-span-5 text-xs text-right text-slate-400">{totals.byStatus[s] || 0}</div>
                  </div>
                );
              })}

              {/* Custom/extra statuses appear below defaults; visible via scroll */}
              {extraStatuses.map((s) => {
                const label = columnLabels?.[s]
                  || (s === "in-progress" ? "In Progress"
                    : s === "todo" ? "To Do"
                    : /^custom(?:-(\d+))?$/.test(s)
                      ? (s === "custom" ? "Custom" : s.replace(/^custom-(\d+)$/, "Custom $1"))
                      : s.charAt(0).toUpperCase() + s.slice(1));
                return (
                  <div key={s} className="grid grid-cols-5 items-center gap-3">
                    <div className="col-span-2 text-xs text-slate-600 dark:text-slate-300">
                      {label}
                    </div>
                    <div className="col-span-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.round(((totals.byStatus[s] || 0) / maxBar) * 100)}%`,
                          backgroundColor: statusColor(s),
                        }}
                      />
                    </div>
                    <div className="col-span-5 text-xs text-right text-slate-400">{totals.byStatus[s] || 0}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PRIORITY_ORDER.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                <div className="text-sm capitalize text-slate-700 dark:text-slate-200">{p}</div>
                <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">{totals.byPriority[p] || 0}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalyticsView;


