# Canvas Zoom

- **Status**: Implemented
- **Created**: 2026-08-01
- **Updated**: 2026-08-01

## Context

REQ-003 asks for canvas zoom (in/out). This was never scoped as a separate build: `@xyflow/react` (chosen for the canvas in [0001](0001-main-screen.md)) provides pan/zoom out of the box, so the requirement was satisfied incidentally and never got a design doc of its own. This doc exists purely to close that documentation gap.

## Goals / Non-Goals

**Goals**

- Record where zoom behavior lives, so it isn't mistaken for an unimplemented requirement.

**Non-Goals**

- Any new behavior — nothing changes here.

## Design

`src/pages/MainScreen/components/Canvas/Canvas.tsx` renders React Flow's `<Controls showInteractive={false} />`, which supplies zoom-in/zoom-out/fit-view buttons. React Flow's `<ReactFlow>` root also handles wheel and pinch zoom natively; no custom zoom state or handlers exist in this codebase. `Canvas.test.tsx` covers the presence of the zoom control buttons.

## Alternatives Considered

Not applicable — this doc documents existing, incidental behavior rather than a design choice made for this requirement.
