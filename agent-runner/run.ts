/**
 * Agent runner script — executes INSIDE the sandbox container.
 *
 * Invoked by the worker via sandbox.execStream():
 *   AGENT_ARGS="$(cat /tmp/agent-args.json)" npx tsx run.ts
 *
 * Reads configuration from AGENT_ARGS env var (JSON), calls the Claude Agent SDK's
 * query() function, and streams SDK messages to stdout as JSON lines.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";

interface AgentArgs {
  prompt: string;
  sessionId: string | null;
  cwd: string;
  systemPrompt: string | null;
  model: string;
  maxTurns: number;
  allowedTools: string[] | null;
}

const DEFAULT_SYSTEM_PROMPT =
  "You are working in an automated code development sandbox. " +
  "Make the requested changes directly — edit files, create files, run tests, install dependencies as needed. " +
  "After completing the requested changes, commit and push your work to the main branch.";

async function main() {
  const raw = process.env.AGENT_ARGS;
  if (!raw) {
    console.log(JSON.stringify({ type: "error", error: "AGENT_ARGS env var not set" }));
    process.exit(1);
  }

  let args: AgentArgs;
  try {
    args = JSON.parse(raw);
  } catch (e) {
    console.log(JSON.stringify({ type: "error", error: `Failed to parse AGENT_ARGS: ${e}` }));
    process.exit(1);
  }

  if (!args.prompt) {
    console.log(JSON.stringify({ type: "error", error: "prompt is required" }));
    process.exit(1);
  }

  const options: Record<string, unknown> = {
    allowedTools: args.allowedTools || [
      "Read",
      "Write",
      "Edit",
      "Bash",
      "Glob",
      "Grep",
    ],
    permissionMode: "acceptEdits",
    cwd: args.cwd,
    model: args.model || "claude-opus-4-6",
    maxTurns: args.maxTurns || 30,
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: args.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    },
    settingSources: ["project"],
  };

  if (args.sessionId) {
    options.resume = args.sessionId;
  }

  for await (const message of query({ prompt: args.prompt, options })) {
    console.log(JSON.stringify(message));
  }
}

main().catch((err) => {
  console.log(
    JSON.stringify({ type: "error", error: `Agent runner failed: ${err?.message || err}` })
  );
  process.exit(1);
});
