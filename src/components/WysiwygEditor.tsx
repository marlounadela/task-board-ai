"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

// Dynamically import ReactQuill to avoid SSR issues
// We'll set up the polyfill in the component before rendering
const ReactQuill = dynamic(() => import("react-quill"), { 
  ssr: false,
  loading: () => <div>Loading editor...</div>
});

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  error?: boolean;
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = "Enter description...",
  maxLength = 500,
  className = "",
  error = false,
}: WysiwygEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Polyfill findDOMNode for react-quill compatibility with React 18
  // This must run before ReactQuill is rendered
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const ReactDOM = require("react-dom");
        if (ReactDOM && (typeof ReactDOM.findDOMNode === "undefined" || ReactDOM.findDOMNode === null)) {
          // Polyfill findDOMNode to work with refs and component instances
          ReactDOM.findDOMNode = (node: any): Element | Text | null => {
            if (!node) return null;
            
            // If it's a ref object with current property
            if (node && typeof node === "object" && "current" in node) {
              const current = node.current;
              if (current && (current.nodeType === 1 || current.nodeType === 3)) {
                return current;
              }
              return current as Element | null;
            }
            
            // If it's already a DOM element or text node
            if (node.nodeType === 1 || node.nodeType === 3) {
              return node;
            }
            
            // If it's a React component instance, try to get the DOM node
            if (node && typeof node === "object") {
              // Try to access internal React fiber structure (React 18+)
              const fiber = (node as any)._reactInternalFiber || 
                          (node as any)._reactInternalInstance ||
                          (node as any).__reactInternalInstance;
              
              if (fiber) {
                let currentFiber = fiber;
                while (currentFiber) {
                  if (currentFiber.stateNode) {
                    const stateNode = currentFiber.stateNode;
                    if (stateNode.nodeType === 1 || stateNode.nodeType === 3) {
                      return stateNode;
                    }
                  }
                  currentFiber = currentFiber.return;
                }
              }
            }
            
            return null;
          };
        }
      } catch (e) {
        // Ignore errors during polyfill setup
        console.warn("Failed to polyfill findDOMNode:", e);
      }
    }
    setIsMounted(true);
  }, []);

  // Calculate character count (strip HTML tags for accurate count)
  const characterCount = useMemo(() => {
    if (!value || typeof document === "undefined") return 0;
    // Create a temporary div to strip HTML tags
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = value;
    return tempDiv.textContent?.length || 0;
  }, [value]);

  const isOverLimit = characterCount > maxLength;

  // Quill editor configuration
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "list",
    "bullet",
    "link",
  ];

  // Handle content change
  const handleChange = (content: string) => {
    if (typeof document === "undefined") {
      onChange(content);
      return;
    }
    // Strip HTML tags to check character count
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const textContent = tempDiv.textContent || "";
    
    // Only allow changes if under character limit
    if (textContent.length <= maxLength) {
      onChange(content);
    }
  };

  // Don't render ReactQuill until component is mounted on client
  if (!isMounted) {
    return (
      <div className={`wysiwyg-editor ${className}`}>
        <div className="border rounded-md border-slate-200 dark:border-slate-700 p-4 min-h-[100px] flex items-center justify-center text-slate-500">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className={`wysiwyg-editor ${className}`}>
      <div
        className={`border rounded-md ${
          error || isOverLimit
            ? "border-red-500 focus-within:border-red-500"
            : "border-slate-200 dark:border-slate-700 focus-within:border-blue-500"
        } transition-colors`}
      >
        <ReactQuill
          theme="snow"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          style={{
            backgroundColor: "transparent",
          }}
          className="wysiwyg-editor-content"
        />
      </div>
      
      {/* Character count */}
      <div className="flex justify-between items-center mt-2 text-sm">
        <div className="text-slate-500 dark:text-slate-400">
          {characterCount}/{maxLength} characters
        </div>
        {isOverLimit && (
          <div className="text-red-500 text-xs">
            Character limit exceeded
          </div>
        )}
      </div>

      <style jsx global>{`
        .wysiwyg-editor-content .ql-editor {
          min-height: 100px;
          max-height: 200px;
          overflow-y: auto;
          font-size: 14px;
          line-height: 1.5;
          color: rgb(15 23 42);
        }
        
        .dark .wysiwyg-editor-content .ql-editor {
          color: rgb(248 250 252);
        }
        
        .wysiwyg-editor-content .ql-toolbar {
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid rgb(226 232 240);
          background-color: rgb(248 250 252);
        }
        
        .dark .wysiwyg-editor-content .ql-toolbar {
          border-bottom-color: rgb(51 65 85);
          background-color: rgb(30 41 59);
        }
        
        .wysiwyg-editor-content .ql-container {
          border: none;
          font-family: inherit;
        }
        
        .wysiwyg-editor-content .ql-editor.ql-blank::before {
          color: rgb(148 163 184);
          font-style: normal;
        }
        
        .dark .wysiwyg-editor-content .ql-editor.ql-blank::before {
          color: rgb(100 116 139);
        }
        
        .wysiwyg-editor-content .ql-toolbar .ql-stroke {
          stroke: rgb(71 85 105);
        }
        
        .dark .wysiwyg-editor-content .ql-toolbar .ql-stroke {
          stroke: rgb(203 213 225);
        }
        
        .wysiwyg-editor-content .ql-toolbar .ql-fill {
          fill: rgb(71 85 105);
        }
        
        .dark .wysiwyg-editor-content .ql-toolbar .ql-fill {
          fill: rgb(203 213 225);
        }
        
        .wysiwyg-editor-content .ql-toolbar button:hover .ql-stroke {
          stroke: rgb(59 130 246);
        }
        
        .wysiwyg-editor-content .ql-toolbar button:hover .ql-fill {
          fill: rgb(59 130 246);
        }
        
        .wysiwyg-editor-content .ql-toolbar button.ql-active .ql-stroke {
          stroke: rgb(59 130 246);
        }
        
        .wysiwyg-editor-content .ql-toolbar button.ql-active .ql-fill {
          fill: rgb(59 130 246);
        }
      `}</style>
    </div>
  );
}
