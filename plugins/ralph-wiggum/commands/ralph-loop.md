---
description: "Start Ralph Wiggum loop in current session"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh:*)"]
hide-from-slash-command-tool: "true"
---

# Ralph Loop

Execute the setup script to initialize the Ralph loop:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" $ARGUMENTS
```

You will now work iteratively. Each iteration, you receive the same prompt. Your previous work persists in files and git history. Use this to progressively refine your work.

If a completion promise is set, you may ONLY output it when the statement is completely and unequivocally TRUE. Do NOT output false promises to exit the loop — even if you feel stuck. The loop is designed to continue until authentic completion. Trust the process.
