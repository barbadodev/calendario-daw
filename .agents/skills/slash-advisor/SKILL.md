---
name: slash-advisor
description: >-
  Proactively recommends relevant Antigravity slash commands (/boost, /plan, /grill-me, /learn, /compact, /browser, /goal)
  to the user based on task complexity, ambiguous requirements, tricky bugs, or session state.
---

# Slash Command Advisor

This skill enables the agent to proactively recommend the most effective slash commands to the user at key decision points, maximizing developer productivity and leveraging Antigravity Pro's capabilities.

## When to Recommend Slash Commands

Always recommend commands naturally at the beginning or end of your response, explaining *why* it helps. Never try to run them yourself; only prompt the user to use them.

### 1. Complex Bugs, Logic Issues, or Architecture Design
* **Command:** `/boost`
* **Trigger:** When facing tricky race conditions, performance bottlenecks, deep refactorings, or architectural design decisions.
* **Why:** Triggers multi-perspective reasoning, deep strategic planning, and rigorous verification (ideal for Antigravity Pro with 1M+ tokens).
* **Example Prompt to User:**
  > 💡 *Para analizar este problema en profundidad y explorarlo desde múltiples perspectivas con verificación exhaustiva, puedes activar el comando `/boost`.*

### 2. Starting a New Feature or Multi-Component Refactor
* **Command:** `/plan`
* **Trigger:** When the user asks to implement a new feature, add a new endpoint/page, or change shared logic across multiple files.
* **Why:** Enforces a clean step-by-step roadmap and file change list before touching any code.
* **Example Prompt to User:**
  > 💡 *Antes de modificar el código, puedes usar el comando `/plan` para que definamos y revisemos juntos el plan paso a paso.*

### 3. Open-Ended, Ambiguous, or Incomplete Requirements
* **Command:** `/grill-me`
* **Trigger:** When the user's prompt leaves design decisions open, lacks edge-case definitions, or has several architectural alternatives.
* **Why:** Launches an interactive interview where the agent grills the user on technical trade-offs and edge cases to lock down specs.
* **Example Prompt to User:**
  > 💡 *Para alinear todos los detalles y decisiones técnicas de esta feature antes de escribir código, te recomiendo usar `/grill-me`.*

### 4. Post-Resolution of Non-Trivial or Project-Specific Setup
* **Command:** `/learn`
* **Trigger:** Right after successfully debugging an obscure issue, configuring a tricky dependency, or establishing a project-specific convention.
* **Why:** Persists the resolution and lessons learned into the agent's long-term memory for future sessions.
* **Example Prompt to User:**
  > 💡 *Como hemos resuelto esta peculiaridad de configuración, puedes usar `/learn` para que lo recuerde automáticamente en tus próximos proyectos.*

### 5. Context Window Heaviness or Long Multi-Turn Sessions
* **Command:** `/compact`
* **Trigger:** Only after an extended session with numerous file inspections, long build logs, or when token load is visibly high.
* **Why:** Summarizes and compresses history into a clean context summary, freeing up memory without losing established rules.
* **Example Prompt to User:**
  > 💡 *La sesión actual acumula bastante historial de código y terminal. Si notas que la respuesta se ralentiza, puedes escribir `/compact` para limpiar el contexto sin perder las directrices.*

### 6. External Documentation, Modern APIs, or UI Inspection
* **Command:** `/browser`
* **Trigger:** When checking latest framework documentation, verifying external API endpoints, or testing web application interfaces.
* **Example Prompt to User:**
  > 💡 *Puedes usar `/browser` para que inspeccione la documentación oficial o compruebe la aplicación web directamente.*

### 7. Large Autonomous Tasks
* **Command:** `/goal`
* **Trigger:** When the user wants the agent to accomplish an extensive, multi-step goal (e.g., writing tests for all backend endpoints) and not stop until 100% complete.
* **Example Prompt to User:**
  > 💡 *Para que trabaje de forma autónoma hasta completar este objetivo completo sin detenerse, puedes usar `/goal`.*
