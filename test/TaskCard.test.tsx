import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskCard } from "@/components/kanban/TaskCard";

describe("TaskCard", () => {
  it("renders task title", () => {
    const task = {
      id: "1",
      title: "Test Task",
      status: "todo",
      labels: "",
      position: 0,
    };
    
    render(<TaskCard task={task} />);
    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });
});
