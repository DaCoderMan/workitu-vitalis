---
description: "Show Ralph Wiggum plugin help"
hide-from-slash-command-tool: "true"
---

# Ralph Wiggum Plugin Help

## What is the Ralph Wiggum Technique?

The Ralph Wiggum technique is an iterative development methodology based on continuous AI loops. Claude receives the same prompt repeatedly while viewing its previous work through modified files and git history, enabling self-directed improvement.

Each iteration follows this cycle:
1. Claude gets the identical prompt
2. Claude modifies files
3. Claude attempts to exit
4. Stop hook intercepts exit and refeeds the same prompt
5. Claude observes and builds upon prior attempts
6. Repeat until task is complete

## Available Commands

- `/ralph-loop <PROMPT> [OPTIONS]` — Start a Ralph loop
  - `--max-iterations <n>` — Max iterations (default: unlimited)
  - `--completion-promise <text>` — Phrase to signal completion
- `/cancel-ralph` — Cancel active loop
- `/ralph-help` — This help

## Example

```
/ralph-loop Build a REST API with tests --completion-promise "COMPLETE" --max-iterations 50
```
