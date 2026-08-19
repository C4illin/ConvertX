#!/usr/bin/env python3
"""
Python wrapper for AI indicator guard hooks.
Calls the appropriate bash script based on the hook type.
"""

import subprocess
import sys
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        print("Usage: ai_guard.py <pre-commit|commit-msg>", file=sys.stderr)
        sys.exit(1)

    hook_type = sys.argv[1]

    # Get the directory where this script is located
    script_dir = Path(__file__).parent

    # Determine which hook script to call
    if hook_type == "pre-commit":
        hook_script = script_dir / "pre-commit"
    elif hook_type == "commit-msg":
        hook_script = script_dir / "commit-msg"
        # For commit-msg, we need to pass the commit message file
        if len(sys.argv) < 3:
            print("Error: commit-msg hook requires message file argument", file=sys.stderr)
            sys.exit(1)
        commit_msg_file = sys.argv[2]
    else:
        print(f"Unknown hook type: {hook_type}", file=sys.stderr)
        sys.exit(1)

    if not hook_script.exists():
        print(f"Hook script not found: {hook_script}", file=sys.stderr)
        sys.exit(1)

    # Call the hook script
    try:
        if hook_type == "commit-msg":
            result = subprocess.run(
                [str(hook_script), commit_msg_file],
                check=False
            )
        else:
            result = subprocess.run(
                [str(hook_script)],
                check=False
            )
        sys.exit(result.returncode)
    except Exception as e:
        print(f"Error running hook: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
