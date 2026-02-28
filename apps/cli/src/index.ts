#!/usr/bin/env node
/**
 * SLATE CLI
 *
 * Command-line interface for running SLATE agents locally.
 *
 * Usage:
 *   npx tsx apps/cli/src/index.ts run <agent> --goal "..." [--autonomy L1] [--output file.json]
 *   npx tsx apps/cli/src/index.ts status
 *   npx tsx apps/cli/src/index.ts list-agents
 */

import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { createRouterFromEnv } from "@slate/llm-provider";

const AGENTS = ["polymath", "resonant", "architect", "executor", "horizon", "alchemist"] as const;
type AgentName = (typeof AGENTS)[number];
type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

interface RunOptions {
  agent: AgentName;
  goal: string;
  autonomy: AutonomyLevel;
  output?: string;
  context?: string;
}

function printUsage(): void {
  console.log(`
SLATE CLI - Run SLATE agents locally

Commands:
  run <agent>      Run an agent with the specified goal
  status           Check LLM provider status
  list-agents      List available agents

Run Options:
  --goal, -g       Goal for the agent (required)
  --autonomy, -a   Autonomy level: L0, L1, L2, L3 (default: L1)
  --output, -o     Output file path (default: stdout)
  --context, -c    Path to context JSON file

Examples:
  npx tsx apps/cli/src/index.ts run polymath --goal "Implement user authentication"
  npx tsx apps/cli/src/index.ts run polymath -g "Build a REST API" -a L2 -o taskmap.json
  npx tsx apps/cli/src/index.ts status
`);
}

function printStatus(): void {
  const router = createRouterFromEnv();
  const status = router.getStatus();

  console.log("\nSLATE LLM Provider Status");
  console.log("=".repeat(40));
  console.log(`Primary Provider:   ${status.primary}`);
  console.log(`Fallback Provider:  ${status.fallback ?? "none"}`);
  console.log(`Available:          ${status.availableProviders.join(", ") || "none"}`);
  console.log(`Ready:              ${status.availableProviders.length > 0 ? "yes" : "NO - set OPENAI_API_KEY or ANTHROPIC_API_KEY"}`);
  if (status.lastError) {
    console.log(`Last Error:         ${status.lastError}`);
  }
  console.log();
}

function listAgents(): void {
  console.log("\nAvailable SLATE Agents");
  console.log("=".repeat(40));
  console.log("polymath   - Divergent exploration, surfaces unknowns");
  console.log("resonant   - Constraint validation, prioritization");
  console.log("architect  - Design specification, API contracts");
  console.log("executor   - Code execution in worktrees");
  console.log("horizon    - Ship/no-ship gate, release validation");
  console.log("alchemist  - Option synthesis when blocked");
  console.log();
}

async function runAgent(options: RunOptions): Promise<void> {
  console.log(`\nRunning ${options.agent} agent...`);
  console.log(`Goal: ${options.goal}`);
  console.log(`Autonomy: ${options.autonomy}`);
  console.log();

  const sessionId = `cli-${Date.now()}`;
  let result: unknown;

  try {
    switch (options.agent) {
      case "polymath": {
        const { run } = await import("@slate/polymath");
        const input = {
          context: { questions: {}, decision_matrix: {} },
          goal: options.goal,
          constraints: []
        };
        result = await run(input, {
          autonomyLevel: options.autonomy,
          sessionId
        });
        break;
      }

      case "resonant": {
        const { run } = await import("@slate/resonant");
        const input = {
          taskMap: {
            id: "placeholder",
            created_at: new Date().toISOString(),
            goal: options.goal,
            assumptions: [],
            unknowns: [],
            options: [],
            quick_checks: [],
            recommended_next: "Run polymath first"
          },
          constraints: [],
          context: { questions: {}, decision_matrix: {} }
        };
        result = await run(input, {
          autonomyLevel: options.autonomy,
          sessionId
        });
        break;
      }

      case "architect": {
        const { run } = await import("@slate/architect");
        const input = {
          evidencePack: {
            id: "placeholder",
            created_at: new Date().toISOString(),
            source_task_map_id: "placeholder",
            goal: options.goal,
            constraints: [],
            recommendations: []
          },
          context: { questions: {}, decision_matrix: {} }
        };
        result = await run(input, {
          autonomyLevel: options.autonomy,
          sessionId
        });
        break;
      }

      case "executor": {
        const { run } = await import("@slate/executor");
        const input = {
          designSpec: {
            id: "placeholder",
            created_at: new Date().toISOString(),
            source_evidence_pack_id: "placeholder",
            summary: options.goal,
            components: [],
            interfaces: [],
            dependencies: [],
            implementation_notes: ""
          },
          worktreePath: process.cwd(),
          commands: []
        };
        result = await run(input, {
          autonomyLevel: options.autonomy,
          sessionId
        });
        break;
      }

      case "horizon": {
        const { run } = await import("@slate/horizon");
        const input = {
          patchSet: {
            id: "placeholder",
            created_at: new Date().toISOString(),
            source_design_spec_id: "placeholder",
            worktree_id: "placeholder",
            branch_name: "main",
            files_changed: [],
            test_summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
            commands_executed: []
          },
          acceptanceCriteria: [options.goal],
          securityThreshold: "medium"
        };
        result = await run(input, {
          autonomyLevel: options.autonomy,
          sessionId
        });
        break;
      }

      case "alchemist": {
        const { run } = await import("@slate/alchemist");
        const input = {
          previousArtifacts: [],
          blockingIssue: options.goal,
          context: { questions: {}, decision_matrix: {} }
        };
        result = await run(input, {
          autonomyLevel: options.autonomy,
          sessionId
        });
        break;
      }

      default:
        console.error(`Unknown agent: ${options.agent}`);
        process.exit(1);
    }

    // Output result
    const output = JSON.stringify(result, null, 2);
    if (options.output) {
      writeFileSync(options.output, output, "utf8");
      console.log(`Result written to: ${options.output}`);
    } else {
      console.log("\nResult:");
      console.log(output);
    }
  } catch (error) {
    console.error("\nAgent execution failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case "status":
      printStatus();
      break;

    case "list-agents":
      listAgents();
      break;

    case "run": {
      const agentName = args[1] as AgentName;
      if (!agentName || !AGENTS.includes(agentName)) {
        console.error(`Invalid agent. Available agents: ${AGENTS.join(", ")}`);
        process.exit(1);
      }

      const { values } = parseArgs({
        args: args.slice(2),
        options: {
          goal: { type: "string", short: "g" },
          autonomy: { type: "string", short: "a", default: "L1" },
          output: { type: "string", short: "o" },
          context: { type: "string", short: "c" }
        },
        allowPositionals: true
      });

      if (!values.goal) {
        console.error("Error: --goal is required");
        printUsage();
        process.exit(1);
      }

      const autonomy = values.autonomy as AutonomyLevel;
      if (!["L0", "L1", "L2", "L3"].includes(autonomy)) {
        console.error("Error: --autonomy must be L0, L1, L2, or L3");
        process.exit(1);
      }

      await runAgent({
        agent: agentName,
        goal: values.goal,
        autonomy,
        output: values.output,
        context: values.context
      });
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
