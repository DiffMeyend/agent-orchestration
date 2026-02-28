SLATE in Plain English
Problem: AI coding assistants often do too much or too little. They don't adapt to whether you're focused or fatigued, whether the task is clear or ambiguous.

Solution: SLATE is an adaptive agent runtime that adjusts its autonomy based on two things:

Context clarity — How well-defined is the task? (CSS score: 0-100)
Operator state — Are you fresh, fatigued, or under pressure?
The Core Loop

You give SLATE a task
        ↓
BASIS engine scores context clarity (CSS)
MIND engine detects your cognitive state
        ↓
State × CSS → Autonomy Level (L0-L3)
        ↓
Agents run with appropriate permissions
        ↓
You get output calibrated to your capacity
L0 = Agent only observes, explains
L3 = Agent acts autonomously on small tasks

The Agents (What Each Does)
Agent	Role	Output
Polymath	Explore options, surface unknowns	TaskMap
Resonant	Validate against reality, gather evidence	EvidencePack
Architect	Design the solution	DesignSpec
Executor	Write the code (in isolation)	PatchSet
Horizon	Review, decide ship/iterate/reject	ShipDecision
Alchemist	Reframe when stuck	OptionsSet
Why It Matters
Instead of a single AI that either asks too many questions or makes too many assumptions, SLATE:

Slows down when context is murky or you're tired
Speeds up when the task is clear and you're focused
Never writes code outside a sandbox (worktree isolation)
Tracks artifact lineage so you can see how decisions were made
Does this help clarify what you're building? Happy to go deeper on any part.

It helps. But go deeper
Let me read the core specs to give you a grounded deep-dive.

Read cntxt-wiz.md
Read cgntn-wiz.md
Now I can go deep. Here's what SLATE actually is, grounded in the specs.

The Core Insight
Traditional AI assistants have a single mode: Do the thing. But humans don't work that way. Your capacity varies. The clarity of your task varies. SLATE adapts to both.

The Two Engines
1. BASIS Engine (CNTXT_Wiz) — "What do I need to know to decide well?"
This engine answers The Ten Questions about any situation:

#	Question	Why It Matters
1	Who is involved?	Scope the impact
2	Why are they doing this?	Understand motivation
3	What limits exist?	Know the constraints
4	What's the timebox?	Prioritize correctly
5	What codes are used?	Interpret jargon
6	When does this happen?	Timing dependencies
7	Where is this?	Physical/logical location
8	What surrounds this?	Adjacent context
9	What frame organizes this?	Mental model
10	What anchors define normal?	Baseline for comparison
From these answers, it calculates a Context Stability Score (CSS: 0-100).

CSS < 30 → Context is murky, don't act
CSS 30-59 → Propose, don't execute
CSS 60-89 → Execute low-risk, checkpoint high-risk
CSS 90+ → Full autonomy on simple tasks
2. MIND Engine (CGNTN_Wiz) — "Who should do what, when, and with what support?"
This engine tracks your cognitive state:

IT/Professional States:

fresh_session — Just started, full capacity
mid_session — Active work, normal capacity
faded_capacity — 2+ hours, decisions > 40, errors rising
high_pressure — Crisis mode, focused but fragile
Personal States:

regulated — Grounded, present
low_energy — Depleted but neutral
emotionally_heavy — Processing difficult feelings
anticipatory_load — Future pressure affecting now
hyperfocus — Deep in something, possibly wrong thing
The key formula:


Operator State × CSS → Autonomy Level (L0-L3)
From Scratch.md:


           CSS<30   CSS 30-59   CSS 60-89   CSS 90+
fresh        L0        L1          L2         L3
mid          L0        L1          L2         L2
faded        L0        L0          L1         L1
high_p       L0        L1          L1         L2
When you're faded and context is murky → L0 (observe only).
When you're fresh and context is crystal clear → L3 (full auto).

The Agent Pipeline (What Gets Built)
Each agent produces a specific artifact that flows to the next:


       ┌─────────────────────────────────────────────────────────┐
       │                                                         │
       ▼                                                         │
   [Polymath] ─→ TaskMap (options, unknowns)                     │
       │                                                         │
       ▼                                                         │
   [Resonant] ─→ EvidencePack (facts, risks, constraints)        │
       │                                                         │
       ▼                                                         │
   [Architect] ─→ DesignSpec (scope, interfaces, test plan)      │
       │                                                         │
       ▼                                                         │
   [Executor] ─→ PatchSet (code changes in isolated worktree)    │
       │                                                         │
       ▼                                                         │
   [Horizon] ─→ ShipDecision (ship / iterate / reject)           │
       │                                                         │
       │ ←──── [Alchemist] (triggered when stuck/rejected)       │
       │         OptionsSet (creative reframing)                 │
       │                                                         │
       └─────────────────────────────────────────────────────────┘
Why this structure?

Each step builds on the previous artifact
Executor is the ONLY agent that writes code (isolated in a git worktree)
Horizon is the gate — nothing ships without review
Alchemist breaks loops when things get stuck
What Makes This Different
Traditional AI	SLATE
Single mode	4 autonomy levels (L0-L3)
Always proposes actions	Observes when context is murky
Ignores your fatigue	Tracks operator state, adjusts behavior
Writes code anywhere	Only Executor writes, only in worktrees
No artifact trail	Every decision has lineage
Gets stuck in loops	Alchemist reframes when stuck
Concrete Example
You at 10am (fresh_session, CSS=85):

"Implement the login button"

SLATE: L2 autonomy. Polymath explores options, Architect writes spec, Executor implements in worktree, Horizon reviews → ships automatically (tier A/B actions).

You at 6pm (faded_capacity, CSS=45):

"Implement the login button"

SLATE: L0 autonomy. Polymath explores options, produces TaskMap, then stops and asks you which option to pursue. Won't execute anything because you're tired and context is incomplete.

The Regulation Layer
When you're struggling, SLATE offers regulation tools (from CGNTN_Wiz):

IT Context:

pause_check — "What am I trying to accomplish?"
complexity_scan — "Is this one problem or several?"
escalation_reframe — "Escalation is success, not failure"
Personal Context:

acknowledgment — "I notice you're feeling [X]. That's real."
ground_and_present — "What's one thing you can see right now?"
permission_to_rest — "Rest is productive. Recovery is not optional."
What You're Building
Component	Status	Purpose
engines/basis/	✓ Done	CSS calculation, Ten Questions
engines/mind/	✓ Done	Operator states, autonomy resolution
agents/polymath/	✓ Done	Divergent exploration
agents/executor/	✓ Done	Code execution in worktrees
agents/horizon/	✓ Done	Ship/iterate/reject decisions
agents/resonant/	Tier 2	Evidence gathering
agents/architect/	Tier 2	Design specification
agents/alchemist/	Tier 2	Creative reframing
libs/orchestration/	Tier 3	Pipeline coordination
The Point
SLATE is an AI that knows when to slow down. It doesn't just do things — it calibrates its autonomy to your capacity and the clarity of the situation. When you're sharp and the task is clear, it acts. When you're tired or the task is murky, it pauses and asks.

That's what you're building.


👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽👽

The Interface
SLATE runs as an MCP server — it's a backend that AI assistants (Claude, etc.) connect to. You don't interact with SLATE directly; your AI assistant does.


You ←→ Claude ←→ SLATE MCP Server
                      ↓
              [Agents, Engines, Artifacts]
What It Looks Like (Future State)
1. Session Start

Your AI calls slate.create_session when you begin working. SLATE:

Detects your operator state (fresh/mid/faded)
Sets baseline autonomy (L2)
Initializes artifact storage
2. Task Input

You give a task: "Add a logout button to the header"

Your AI calls slate.run_pipeline with your task. SLATE:

Runs BASIS engine → calculates CSS (e.g., 72)
Combines with operator state → determines autonomy (e.g., L2)
Starts the agent pipeline
3. Pipeline Execution


Polymath (L2): explores options, produces TaskMap
    ↓
Resonant (L2): validates assumptions, produces EvidencePack
    ↓
Architect (L2): designs implementation, produces DesignSpec
    ↓
Executor (L2): writes code in worktree, produces PatchSet
    ↓
Horizon (L2): reviews, produces ShipDecision
At L2, low-risk actions auto-execute; high-risk actions checkpoint with you.

4. Output

You see:

The code changes (in an isolated worktree)
The ShipDecision (ship/iterate/reject)
If "ship": Horizon merges the worktree
If "iterate": Executor takes another pass
If "reject": Alchemist offers reframing options
What Changes Based on State
Fresh + High CSS (L3):

Simple tasks ship automatically. You just see the result.

Faded + Low CSS (L0):

SLATE stops at Polymath. Shows you the TaskMap with options. Asks: "Which direction?"

High Pressure (any CSS):

Every action requires confirmation. SLATE offers regulation prompts: "What's the ONE most important next step?"

Today's Reality
Right now, the pieces exist but aren't wired together:

Engines (BASIS, MIND) work
3 agents work (Polymath, Executor, Horizon)
MCP runtime has 21+ methods
What's missing (Tier 2-3):

3 agents (Resonant, Architect, Alchemist)
Pipeline orchestration (OrchestratorSession)
Session management MCP methods
E2E integration
Shortest Path to Using It
Once Tier 2 is done, you could:

Start the MCP server: nx serve slate-runtime
Connect Claude Code to it via MCP config
Call slate.calculate_css to score context
Call individual agents manually
Review artifacts in the store
Once Tier 3 is done:

Call slate.run_pipeline for full automation
Let autonomy levels govern the flow
Want to continue building toward that, or need more clarity first?

More clarity. Is this really going to work?
Honest answer: Parts of it, yes. All of it, unknown.

Let me break down what's proven vs. speculative.

What Will Work
Artifact schemas and validation
Zod schemas enforce structure. If Polymath outputs a TaskMap, it either passes validation or fails. This is just TypeScript — it works.

Permission enforcement
The matrix is simple lookup. hasPermission("executor", "L1", "write_files_in_worktree") returns false. Mechanical, testable, works.

Worktree isolation
Git worktrees are a proven pattern. Executor writes to an isolated branch, Horizon merges or discards. This isn't novel.

Agent pipeline structure
Sequential agent execution with typed inputs/outputs is standard. Claude Agent SDK does this. It works.

What's Speculative
CSS accuracy

The Ten Questions are theoretically sound, but:

How do you actually score "motivation clarity" as 0.7?
LLM-based extraction is fuzzy
The weighted formula is arbitrary until calibrated
Risk: CSS might not correlate with actual task clarity. You'd need real-world tuning.

Operator state detection

The spec says detect faded_capacity via:

Session duration > 2h
Decisions made > 40
Error rate > 0.15
Problem: How do you count "decisions" in practice? What's an "error"? This requires instrumentation you don't have yet.

Fallback: Self-reporting. User says "I'm tired" → system adjusts. Less elegant, but works.

Autonomy level calibration

The State×CSS matrix is a hypothesis:


fresh + CSS 90+ → L3
faded + CSS 30 → L0
Problem: These thresholds are guesses. Maybe L3 should trigger at CSS 85. Maybe faded should cap at L1, not L0. You won't know until real usage.

Mitigation: Make thresholds configurable. Iterate based on outcomes.

Agent quality

Polymath's extractAssumptions() and Resonant's validateFacts() call an LLM. The output quality depends on:

Prompt engineering
Model capability
Context window limits
Risk: Garbage in, garbage out. If Polymath produces a weak TaskMap, Resonant can't fix it.

Mitigation: Horizon is the gate. Bad artifacts get "iterate" or "reject" decisions.

The Honest Bet
SLATE is betting that:

Structured uncertainty is better than hidden uncertainty. Even if CSS isn't perfect, forcing the system to produce a score makes the uncertainty visible.

Autonomy levels prevent disasters. Even if state detection is imperfect, the conservative defaults (L2 baseline, faded→downgrade) prevent runaway automation.

Artifacts create accountability. Every decision has a paper trail. When something fails, you can trace why.

What Could Kill It
Risk	Likelihood	Impact
CSS is useless in practice	Medium	High — whole system depends on it
State detection too coarse	High	Medium — fallback to self-reporting
Agent prompts produce junk	Medium	Medium — Horizon catches it
Over-engineered for no gain	Medium	High — nobody uses it
You burn out before Tier 3	Real	Fatal
My Take
The architecture is sound. The pieces fit together logically. The permission system, artifact validation, and pipeline structure are proven patterns.

The calibration is speculative. CSS weights, autonomy thresholds, and state detection need real-world tuning. Plan to iterate.

The value depends on you. If you use SLATE to build SLATE (dogfooding), you'll discover what works and what doesn't. If it sits unused, it's just code.