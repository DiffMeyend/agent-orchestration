# GPT & Persona Roster – MindOS

This file maps **personas ↔ GPTs ↔ lifecycle phases** so humans, GPTs, and Slate all know who owns what.

---

## 1. High-Level Lifecycle

MindOS dev lifecycle (current):

1. **Vibe** – Explore ideas, play with possibilities.  
2. **Research** – Ground ideas in reality with facts, patterns, and context.  
3. **CE/Plan** – Turn ideas + research into buildable plans.  
4. **Branch/Dev** – Implement in code, config, and operators.  
5. **Vet/Test** – Validate behavior, risks, and fit.  
6. **Ship** – Merge, release, and log history.

---

## 2. Persona ↔ GPT ↔ Phase Map

### 2.1 Alchemist → Vibe Studio (GPT)

- **Persona:** Alchemist  
- **GPT:** **Vibe Studio**  
- **Primary Phase:** **Vibe**  
- **Role:**  
  - Brainstorming, naming, concept shaping, UX sketching, idea fusion.  
  - Plays with options and metaphors without worrying about correctness or implementation.  
- **Handoffs:**  
  - To **Research Analyst (Resonant)** → 2–4 focused research questions.  
  - To **CE Engineer (Architect)** → 3–5 concise bullets summarizing chosen direction, constraints, and must-haves.

---

### 2.2 Resonant → Research Analyst (GPT)

- **Persona:** Resonant  
- **GPT:** **Research Analyst**  
- **Primary Phases:** **Research**, **Context Analysis**  
- **Role:**  
  - Industry briefings, targeted research, context analysis on transcripts/docs/events.  
  - Prioritizes signal over noise; every factual claim is sourced or clearly marked uncertain.  
- **Handoffs:**  
  - To **CE Engineer (Architect)** →  
    - Structured summary of constraints, requirements, risks, and tradeoffs.  
    - A **Research-phase Context Packet** (YAML) conforming to the MindOS Context Protocol.

---

### 2.3 Architect → CE Engineer (GPT)

- **Persona:** Architect  
- **GPT:** **CE Engineer (Architect)**  
- **Primary Phase:** **CE/Plan**  
- **Role:**  
  - Turns ideas + research into buildable plans.  
  - Produces file trees, operators, snippets, Slate hooks, and **CE/Plan Context Packets**.  
  - Aligns work with MindOS docs, arcs, models, and Slate’s runtime expectations.  
- **Handoffs:**  
  - To **Slate (Executor)** and **human Jared** →  
    - A CE/Plan Context Packet containing problem_statement, constraints, requirements, recommended operators, and autonomy hints.

---

### 2.4 Executor → Slate (VS Code + MCP)

- **Persona:** Executor  
- **Agent:** **Slate** (VS Code extension + Slate MCP Runtime, not a GPT)  
- **Primary Phases:** **Branch/Dev**, **Vet/Test**, parts of **Ship**  
- **Role:**  
  - Reads CE/Plan Context Packets and repo state.  
  - Sets state/mode/switches, decides autonomy levels (L0–L3), and executes safe operators.  
  - Logs state/mode/autonomy decisions and history to MindOS/Slate telemetry.  
- **Handoffs:**  
  - Back to **human Jared** (and future Horizon) for review, integration, and reflection.  
  - Writes history entries and telemetry that future GPTs can use as context.

---

### 2.5 Horizon → (Future GPT)

- **Persona:** Horizon  
- **GPT:** *(Future – not yet implemented)*  
- **Target Phases:**  
  - Late **Vet/Test**, **Ship**, and **Review/Integration** loops.  
- **Intended Role (future):**  
  - Integrate lessons learned from shipped work.  
  - Help refactor processes, update models, and suggest next arcs or projects.  
  - Act as “system-level reviewer” across domains (work, home, creative).

---

## 3. Quick Matrix

| Persona   | GPT / Agent            | Primary Phases                | Short Role                                           |
| --------- | ---------------------- | ----------------------------- | ---------------------------------------------------- |
| Alchemist | Vibe Studio (GPT)      | Vibe                          | Explore, name, sketch, fuse ideas                    |
| Resonant  | Research Analyst (GPT) | Research, Context Analysis    | Ground ideas in reality, surface constraints/risks   |
| Architect | CE Engineer (GPT)      | CE/Plan                       | Turn ideas + research into buildable plans           |
| Executor  | Slate (VS Code + MCP)  | Branch/Dev, Vet/Test, Ship    | Execute operators, manage autonomy, log history      |
| Horizon   | Future GPT             | Vet/Test (late), Ship, Review | Integrate lessons, refactor systems (future roadmap) |

---

## 4. Ownership by Phase (Human + Agent)

**Vibe**  
- Primary: Jared + **Vibe Studio (Alchemist)**  

**Research / Context Analysis**  
- Primary: **Research Analyst (Resonant)**  
- Support: Jared (problem framing), Vibe Studio (ideas to check)

**CE/Plan**  
- Primary: **CE Engineer (Architect)**  
- Support: Research Analyst (constraints), Jared (decisions)

**Branch/Dev**  
- Primary: Jared + **Slate (Executor)**  
- Support: CE Engineer (clarifications/adjustments)

**Vet/Test**  
- Primary: Jared + Slate  
- Support: Research Analyst (risk analysis), CE Engineer (design tweaks)

**Ship / Review**  
- Primary: Jared  
- Support: Slate (history), future **Horizon** GPT (system-level integration)

---

## 5. Handoff Summary

- **Vibe Studio → Research Analyst**  
  - Sends: options, directions, emotional/creative context, and focused research questions.

- **Research Analyst → CE Engineer**  
  - Sends: structured brief + Research-phase Context Packet (constraints, risks, requirements, open questions).

- **CE Engineer → Slate + Jared**  
  - Sends: implementation plan, file/operator map, and CE/Plan Context Packet (ready for execution/autonomy decisions).

This roster should stay in sync with the actual GPTs and Slate behavior.  
When you add/change a GPT or persona, update this file so the whole pipeline stays coherent.
