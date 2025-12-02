import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSubtasks(taskTitle: string, taskDescription?: string) {
  const prompt = `Given this task: "${taskTitle}"${
    taskDescription ? ` with description: "${taskDescription}"` : ""
  }, generate 3-5 actionable subtasks. Return as JSON array of strings.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;
  return JSON.parse(content || "[]");
}

export async function suggestPriority(taskTitle: string, dueDate?: Date) {
  const prompt = `Analyze this task: "${taskTitle}"${
    dueDate ? ` due on ${dueDate.toISOString()}` : ""
  }. Suggest priority (low/medium/high) with brief reason. Return JSON: {"priority": "...", "reason": "..."}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  const content = completion.choices[0].message.content;
  return JSON.parse(content || "{}");
}

interface TaskSummary {
  title: string;
  status: string;
}

export async function generateDailySummary(tasks: TaskSummary[]) {
  const taskList = tasks.map((t) => `- ${t.title} (${t.status})`).join("\n");
  const prompt = `Summarize this task list in 2-3 sentences:\n${taskList}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return completion.choices[0].message.content || "";
}
