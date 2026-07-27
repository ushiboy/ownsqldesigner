# Code Organization

## When

Every time you create or modify a TypeScript / TSX source file.

## What

Order the contents of a file as follows:

1. Imports
2. Constants and type definitions (types, interfaces, and constants used in the file)
3. Exported (public) functions and React components
4. Private (non-exported) functions and components, placed toward the bottom of the file in dependency order — a caller appears above the helpers it calls

## Rules

- Exported functions and React components MUST appear at the top of the file, immediately after imports, constants, and type definitions.
- Constants and type definitions MUST be declared before the exported functions/components that use them.
- Private helper functions and components MUST be placed after the exported ones, ordered so that each helper appears below the code that depends on it.
- Extract a conditional expression that combines multiple `||` / `&&` / `!` operators into a named private helper function instead of inlining it. A named predicate (e.g. `hasColumn(table, columnId)`) reads and reuses better than a compound boolean written out at the call site.
- This ordering is for regular source files. Test files (`*.test.ts(x)`) use the opposite order for their helpers — see [Testing](testing.md).

## Example

```tsx
import { useState } from "react";

// 1. Constants and type definitions
const MAX_COLUMNS = 20;

type TableProps = {
  name: string;
};

// 2. Exported component
export function Table({ name }: TableProps) {
  return <div>{formatName(name)}</div>;
}

// 3. Private helpers, in dependency order (caller above callee)
function formatName(name: string): string {
  return truncate(name, MAX_COLUMNS);
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
```
