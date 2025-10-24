# Copilot v2.2 - Review/Replace UX Implementation

## Overview
This implementation adds a comprehensive Review mode to the Copilot that detects existing flows and provides intelligent guidance for editing, replacing, or enhancing them.

## Key Features Implemented

### 1. Flow Inspector Service
**File**: `packages/server/src/services/copilot/FlowInspector.ts`

- Analyzes flow structure and content
- Detects flow type (MULTIAGENT, RAG, CHATFLOW, EMPTY)
- Identifies entry nodes (agents, chat models)
- Validates credentials and parameters
- Checks graph structure for issues
- Returns comprehensive flow summary with:
  - Node count and entry points
  - Missing credentials and parameters
  - Graph validation issues
  - Recommended actions
  - Runnable status

### 2. Review Mode API Endpoints
**File**: `packages/server/src/controllers/copilot/index.ts`

- **POST /api/v1/copilot/review**: Inspects a flow and returns summary + gaps
- **POST /api/v1/copilot/annotate**: Adds explanatory sticky notes to nodes
- **POST /api/v1/copilot/replace**: Replaces flow in-place or signals to create new

### 3. Enhanced FlowPatchService
**File**: `packages/server/src/services/copilot/FlowPatchService.ts`

New methods added:
- `reviewFlow()`: Uses FlowInspector to analyze flows
- `annotateFlow()`: Adds sticky notes explaining node purposes and gaps
  - Color-coded notes (blue for info, yellow for gaps)
  - Idempotent (updates existing notes instead of duplicating)
- `replaceFlow()`: Handles in-place replacement with full validation
  - Credential validation before replacement
  - Graph validation for structural integrity
  - Full undo snapshot for safe reverting

### 4. Review Mode UI
**File**: `packages/ui/src/views/copilot/WorkflowCopilotDock.jsx`

Features:
- **Auto-detects non-empty canvases** and enters Review mode
- **Summary banner** showing:
  - Flow status (ready/needs attention)
  - What the flow does
  - Missing credentials and parameters
  - Graph issues
- **Action buttons**:
  - **Fix & Run**: Switches to Clarify mode to fill gaps
  - **Replace**: Opens confirmation dialog
  - **Annotate nodes**: Adds explanatory sticky notes
- **Replace confirmation dialog**:
  - Recommends creating new flow (default)
  - Option to replace in-place
  - Best practice tip shown

### 5. Replace Confirmation Dialog
Beautiful, user-friendly dialog that:
- Explains the impact of replacing
- Shows best practice recommendation (create new flow)
- Provides two clear options:
  - Create new flow (primary)
  - Replace in place (secondary)
- Includes helpful "💡 Best Practice" tip

### 6. Canvas Integration
**Files**: 
- `packages/ui/src/views/canvas/index.jsx`
- `packages/ui/src/views/agentflowsv2/Canvas.jsx`

- Passes `currentFlowData` prop to WorkflowCopilotDock
- Uses `reactFlowInstance?.toObject()` to get current graph state
- Refreshes canvas when Copilot makes changes

### 7. Updated Summary Card
**File**: `packages/ui/src/views/canvas/CanvasSummaryCard.jsx`

- Shows mode indicator (Review/Applied)
- Displays plan status at a glance

## User Experience Flow

### For Existing Flows:
1. User opens Copilot on a flow with existing nodes
2. Copilot **automatically enters Review mode**
3. Shows summary: "This multi-agent flow uses..."
4. Lists any missing credentials, parameters, or issues
5. Offers three clear actions:
   - **Fix & Run**: Guide user to fill gaps
   - **Replace**: Change the flow purpose
   - **Annotate nodes**: Add explanatory notes

### Replace Flow Journey:
1. User clicks "Replace"
2. Dialog appears: "You're changing the purpose of this flow"
3. Shows recommendation: "Create a new flow instead"
4. User chooses:
   - **Create new flow** (default) → Navigates to new flow
   - **Replace in place** → Replaces with undo snapshot

### Annotate Nodes:
1. User clicks "Annotate nodes"
2. Copilot analyzes each node
3. Adds sticky notes next to nodes showing:
   - Node purpose
   - Missing credentials (yellow)
   - Missing parameters (yellow)
   - General info (blue)
4. Notes are positioned automatically
5. Re-running updates notes instead of duplicating

## Technical Highlights

### Validation & Safety
- **Credential validation** before any changes
- **Graph validation** ensures structural integrity
- **Undo snapshots** for all modifications
- **Idempotent operations** (annotations won't duplicate)

### Smart Detection
- Auto-detects flow type (MULTIAGENT, RAG, CHATFLOW)
- Identifies entry nodes and orphaned components
- Checks for required inputs on agents
- Validates handle connections

### User-Friendly Design
- Clear, actionable language
- Progressive disclosure (show what's needed)
- Best practice guidance built-in
- Visual feedback (color-coded notes)
- Non-destructive defaults (create new > replace)

## Testing the Implementation

1. **Empty Canvas**: Opens in Intent mode (create new)
2. **Existing Flow**: Opens in Review mode with summary
3. **Fix & Run**: Switches to Clarify to address gaps
4. **Replace**: Shows confirmation with create new as default
5. **Annotate**: Adds color-coded notes to all nodes

## Future Enhancements (Not in This PR)

- Append mode for adding components
- Transform mode for modifying without replace
- LLM-powered flow type detection
- Smart suggestions based on flow analysis
- One-click fix for common issues

## Database Migrations

All necessary tables (CopilotConversation, CopilotMessage, CopilotEdit, CopilotState) are already in place from previous implementations.

## API Client Updates

**File**: `packages/ui/src/api/copilot.js`

Added:
- `review(body)`: POST /copilot/review
- `annotate(body)`: POST /copilot/annotate
- `replace(body)`: POST /copilot/replace





