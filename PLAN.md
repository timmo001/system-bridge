# Plan

## Issue

@https://github.com/timmo001/system-bridge/issues/3475 CPU and CPU types

We need to attempt to implement each of the missing items.

## Requirements

Keep a file to log the changes made and what attempt you are on.

Here's the plan, do not leave this plan.

Remember to update and follow the @CPU_CHANGES_LOG.md file.

Follow the rules in @.cursor/rules/*.mdc

## Steps

for each item and type (these will match):

1. search the @Web for a good implementation in @Go
2. Implement the change
3. Test the change using the CLI command: `go run . client data run --module cpu`
4. Fix any issues and compare them with system calls / commands if needed
5. Test again as above.
6. Go back to 4 if not fixed. If we have make several attempts to no avail, mark this change as failed, revert the changes (you can use git to reset since we are committing each time) and skip to 8 (continue to the next item)
7. Make a commit with the change. Keep the message short and to the point
8. Continue to the next item
