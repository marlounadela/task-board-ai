"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Square } from "lucide-react";

interface TimerProps {
  onSave: (duration: number) => Promise<void>;
}

export function Timer({ onSave }: TimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (seconds > 0) {
      await onSave(seconds);
      setSeconds(0);
    }
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="text-4xl font-mono font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {formatTime(seconds)}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Time tracking</p>
        </div>
        
        <div className="flex gap-3 justify-center">
          {!isRunning ? (
            <Button 
              onClick={handleStart} 
              size="icon" 
              className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Play className="h-5 w-5" />
            </Button>
          ) : (
            <Button 
              onClick={handlePause} 
              size="icon" 
              className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Pause className="h-5 w-5" />
            </Button>
          )}
          <Button 
            onClick={handleStop} 
            size="icon" 
            variant="outline"
            disabled={seconds === 0}
            className="w-12 h-12 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          >
            <Square className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
