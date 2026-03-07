---
description: "Show Ralph Wiggum plugin help"
hide-from-slash-command-tool: "true"
---

# Ralph Wiggum Plugin Help

## What is the Ralph Wiggum Technique?

The Ralph Wiggum technique is an iterative development methodology based on continuous AI loops, pioneered by Geoffrey Huntley. The key insight: Claude receives the same prompt repeatedly while viewing its previous work through modified files and git history, enabling self-directed improvement.

Each iteration follows this cycle:
1. Claude gets the identical prompt
2. Claude modifies files
3. Claude attempts to exit
4. Stop hook intercepts exit and refeeds the same prompt
5. Claude observes and builds upon prior attempts
6. Repeat until task is complete

## Available Commands

### `/ralph-loop <PROMPT> [OPTIONS]`

Initiates a Ralph loop within your session.

**Options:**
- `--max-iterations <n>` — Maximum iterations before auto-stop (default: unlimited)
- `--completion-promise <text>` — Promise phrase that signals completion

**Example:**
```bash
/ralph-loop "Build a REST API with tests" --completion-promise "COMPLETE" --max-iterations 50
```

### `/cancel-ralph`

Cancels the active Ralph loop and reports which iteration it was on.

## Key Concepts

### Completion Promises

To signal completion, output: `<promise>YOUR_PHRASE</promise>`

The promise must ONLY be output when its statement is completely and unequivocally TRUE. Do not lie to exit the loop.

### How the Loop Works

1. State file created at `.claude/ralph-loop.local.md`
2. Execute task as described in prompt
3. Exit attempt intercepted by stop hook
4. Identical prompt resubmitted
5. Previous work visible in files and git history
6. Continue until promise detected or max iterations reached

## When to Use Ralph

**Good for:**
- Tasks with explicit success metrics
- Work requiring multiple refinement cycles
- Self-correcting development (TDD)
- Greenfield projects

**Not good for:**
- Decisions requiring human expertise
- Single-pass operations
- Ambiguous completion criteria
- Production debugging

## Philosophy

> "Ralph is a Bash loop" — Geoffrey Huntley

- **Iteration > Perfection** — Don't aim for perfect on first try
- **Failures Are Data** — Deterministically bad means predictable and informative
- **Operator Skill Matters** — Success depends on writing good prompts
- **Persistence Wins** — Keep trying until success
