### core/strengths/model.yaml
1. **Arc Type / Domain:** Core strengths (CliftonStrengths operating levers).
2. **Entities / Keys:** self (`jared_operator`), strength IDs (maximizer, command, strategic, ideation, arranger); features like “strengths_as_operating_levers,” “overuse_risk_patterns.”
3. **Intended Use:** Model how each strength shows up, risks of overuse, and guide task/role selection and self-respect during struggle.
4. **Recommended GPT Audience:** CE Engineer (Architect) and Research Analyst; Slate may reference for autonomy hints.

### core/values/model.yaml
1. **Arc Type / Domain:** Core values (alignment axes).
2. **Entities / Keys:** self, values (wisdom, knowledge, modularity, independence, creativity, recursion, nature, friends, love, relaxation, humor); features like “tension_between_values_and_external_demands.”
3. **Intended Use:** Anchor decisions/routines, resolve conflicting priorities, and check alignment of plans.
4. **Recommended GPT Audience:** Research Analyst and CE Engineer; informs Vibe tone but details are more architectural.

### core/personas/model.yaml (LEGACY)
> STATUS: ARCHIVED. Historical persona content now lives under `_archive/personas/`. Replace with agent definitions in `docs/agents/handbook.md`.

### core/personas/archetypes/*/model.yaml (LEGACY)
> STATUS: ARCHIVED. Agent behavior is defined via manifests under `tools/agents/`; archetype docs remain in `_archive/` for reference only.

### core/neurotype/model.yaml
1. **Arc Type / Domain:** Neurotype context (autistic patterning, sensory load, regulation).
2. **Entities / Keys:** self core, environment, sensory channels, DBT/strength references.
3. **Intended Use:** Define how neurotype influences work, regulation, and interactions across arcs.
4. **Recommended GPT Audience:** Research Analyst (to respect constraints) and CE Engineer (when building operators).

### domain/home/calendar/model.yaml
1. **Arc Type / Domain:** Home calendar domain.
2. **Entities / Keys:** self, systems (iCloud, Calendar app, CLI pull), environment (home domain); features like “agenda_visibility,” “single_source_of_truth.”
3. **Intended Use:** Model how to pull/reflect agenda data for planning while staying read-only.
4. **Recommended GPT Audience:** CE Engineer (when wiring integration) and Research Analyst (domain understanding).

### domain/home/food/model.yaml
1. **Arc Type / Domain:** Home food/cookbook domain.
2. **Entities / Keys:** self, systems (cookbook, equipment inventory, meal plan folder), environment (home kitchen); features like “recipe index,” “equipment mapping.”
3. **Intended Use:** Support meal planning, regenerate indexes, surface recipes by protein/method.
4. **Recommended GPT Audience:** CE Engineer & Research Analyst; Vibe may reference constraints but details are technical.

### domain/work/ascend/model.yaml
1. **Arc Type / Domain:** Work/Ascend MSP context.
2. **Entities / Keys:** self as engineer, org (ascend_msp), systems (ticket pipeline, interruptions channel, leadership loop, office environment); features like “ticket_flow,” “sensory_load.”
3. **Intended Use:** Sustain service desk work (handle tickets, interrupts, leadership signals) without overwhelm.
4. **Recommended GPT Audience:** CE Engineer (plans/operators for work context) and Research Analyst (context constraints).

**Models to share with the Agent Handbook:** `docs/agents/handbook.md`, `context/protocol/context_pipeline.yaml`, `context/schemas/context_packet.schema.json`.

**Models useful for research_agent:** `core/strengths`, `core/values`, `core/neurotype`, `domain/home/calendar`, `domain/home/food`, `domain/work/ascend`.

**Legacy references:** `_archive/personas/` retains persona archetypes and related docs for historical context; they should not be used for runtime behavior.
