# AI-Blocking Git Hooks

Git hooks that prevent AI indicators from being committed to your repository.

## What These Hooks Block

The hooks scan for AI references including:

- AI tool names (Claude, Cursor, Copilot, ChatGPT, Gemini, etc.)
- AI-related phrases ("ai-generated", "ai-assisted", "generated with", etc.)
- Model names (GPT-4, Claude Sonnet, Claude Code, etc.)
- Company names (OpenAI, Anthropic, etc.)
- Co-authorship markers (Co-Authored-By: Claude, noreply@anthropic.com, etc.)

## Prerequisites

Install [pre-commit](https://pre-commit.com/):

```bash
pip install pre-commit
```

## Installation

### Single Repository

1. Navigate to your repository:

   ```bash
   cd /path/to/your/repo
   ```

2. Create or update `.pre-commit-config.yaml`:

   ```yaml
   repos:
     - repo: local
       hooks:
         - id: ai-pre-commit
           name: Block AI indicators in staged files
           entry: python3 .config/ai-hooks/ai_guard.py pre-commit
           language: system
           pass_filenames: false
           stages: [pre-commit]
         - id: ai-commit-msg
           name: Block AI indicators in commit messages
           entry: python3 .config/ai-hooks/ai_guard.py commit-msg
           language: system
           stages: [commit-msg]
   ```

3. Install the hooks:

   ```bash
   pre-commit install
   ```

## How It Works

### commit-msg Hook

- Runs when you create a commit
- Scans the commit message for AI indicators
- Blocks the commit if any indicators are found

### pre-commit Hook

- Runs before the commit is created
- Scans all staged files for AI indicators
- Blocks the commit if any indicators are found in the code

## Uninstallation

To remove the hooks from a repository:

```bash
cd /path/to/your/repo
rm .git/hooks/commit-msg .git/hooks/pre-commit .git/hooks/ai_guard.py
```

## Testing

To verify the hooks are working:

1. Create a test file with AI indicators:

   ```bash
   echo "Generated with Claude Code" > test.txt
   git add test.txt
   git commit -m "test"
   ```

2. You should see an error message blocking the commit

3. Clean up:
   ```bash
   git reset HEAD test.txt
   rm test.txt
   ```

## Bypassing Hooks When Needed

In rare cases where you need to commit content with AI indicators, you can bypass the hooks using the `--no-verify` flag:

```bash
git commit --no-verify -m "your commit message"
```

## Notes

- These hooks are **repository-specific** and must be installed in each repo where you want them active
- Git hooks are not tracked by git itself (they live in `.git/hooks/`)
- If you have existing hooks, the installer will create `.backup` copies
- All pattern matching is case-insensitive
