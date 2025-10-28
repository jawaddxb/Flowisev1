# Where to Find Quick Setup in the UI

## Location
The Quick Setup CTA appears in the **Copilot Dock** (right-side panel) when you open a workflow canvas.

## When It Shows
The Quick Setup button appears when:
1. **Mode is DISCOVERY** - When you first open a marketplace template or empty canvas
2. **Mode is BUILDING and empty** - When you're in building mode but haven't made progress yet (`messages.length <= 1` and `!runnable`)

## Visual Layout

```
┌─────────────────────────────────────────┐
│  Canvas (workflow builder)              │
│                                          │
│                                          │  ┌──────────────────────┐
│                                          │  │ Copilot              │
│                                          │  ├──────────────────────┤
│                                          │  │                      │
│                                          │  │ ┌──────────────────┐ │
│                                          │  │ │  ⚡ Quick Setup  │ │
│                                          │  │ ├──────────────────┤ │
│                                          │  │ │ Build a complete │ │
│                                          │  │ │ research workflow│ │
│                                          │  │ │ in one click...  │ │
│                                          │  │ ├──────────────────┤ │
│                                          │  │ │  [Quick Setup:   │ │ <- THE BUTTON
│                                          │  │ │   Research →     │ │
│                                          │  │ │   Email]         │ │
│                                          │  │ ├──────────────────┤ │
│                                          │  │ │ Or describe your │ │
│                                          │  │ │ own workflow     │ │
│                                          │  │ └──────────────────┘ │
│                                          │  │                      │
│                                          │  │ [Chat messages...]   │
│                                          │  │                      │
│                                          │  │ [Input field]        │
│                                          │  └──────────────────────┘
└─────────────────────────────────────────┘
```

## How to Access

1. **Open a chatflow or agentflow**
   - Navigate to `/canvas/{flowId}` or `/v2/agentcanvas/{flowId}`

2. **Open Copilot**
   - Click the **✨ sparkle icon** in the top-right canvas header
   - OR the Copilot automatically opens if `COPILOT_AUTO_OPEN=true`

3. **See Quick Setup**
   - If the canvas is empty or you're just starting, you'll see the Quick Setup card
   - It's a blue dashed-border box with a gradient button

## Code Location
File: `packages/ui/src/views/copilot/WorkflowCopilotDock.jsx`
Lines: 1097-1168

```jsx
{(mode === 'DISCOVERY' || (mode === 'BUILDING' && messages.length <= 1 && !runnable)) && (
    <Box sx={{ mb: 2, p: 2, border: '2px dashed #2196F3', borderRadius: 2, textAlign: 'center', backgroundColor: 'rgba(33, 150, 243, 0.05)' }}>
        <Typography variant='h6' sx={{ mb: 1, color: '#2196F3', fontWeight: 600 }}>
            ⚡ Quick Setup
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            Build a complete research workflow in one click. I'll set up search, AI analysis, and email delivery automatically.
        </Typography>
        <LoadingButton
            variant='contained'
            fullWidth
            size='large'
            ...
        >
            Quick Setup: Research → Email
        </LoadingButton>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
            Or describe your own workflow below
        </Typography>
    </Box>
)}
```

## What Happens When You Click

1. User clicks "Quick Setup: Research → Email"
2. Copilot sends message: "⚡ Setting up your research workflow..."
3. Calls `autoFixApi.request({ flowId, action: 'autoFixAll', params: { quickSetup: true } })`
4. Backend builds nodes + edges for research workflow
5. Canvas updates with new nodes (search tools, AI model, agent, etc.)
6. Copilot enters CONFIGURE mode
7. Reviews workflow for missing credentials
8. Shows either:
   - "✅ Ready to test!" (if all managed creds exist)
   - Inline credential inputs (if personal creds needed)

## Design Details

- **Border**: 2px dashed blue (#2196F3)
- **Background**: Light blue tint (rgba(33, 150, 243, 0.05))
- **Button**: Gradient blue (linear-gradient(45deg, #2196F3 30%, #21CBF3 90%))
- **Typography**: 
  - Header: h6, bold, blue
  - Description: body2, text.secondary
  - Helper: caption, text.secondary

## States

### Before Click
```
┌────────────────────────────────┐
│  ⚡ Quick Setup                │
│  Build a complete research... │
│  [Quick Setup: Research → Email]│ <- Enabled, gradient blue
│  Or describe your own...       │
└────────────────────────────────┘
```

### During Click (Loading)
```
┌────────────────────────────────┐
│  ⚡ Quick Setup                │
│  Build a complete research... │
│  [🔄 Loading...]               │ <- Loading spinner
│  Or describe your own...       │
└────────────────────────────────┘
```

### After Success
Quick Setup box disappears, replaced by review panel showing credential status.

## Troubleshooting

**Q: I don't see the Quick Setup button**
- Check if Copilot is open (click ✨ sparkle icon)
- Check if you're in DISCOVERY or early BUILDING mode
- If you already have nodes on canvas, the button won't show (by design)

**Q: Button is there but disabled**
- Check if `isProcessing` is true (another action in progress)

**Q: Nothing happens when I click**
- Check browser console for errors
- Verify `autoFixApi` is defined and endpoint `/copilot/auto-fix` exists
- Check network tab for API response

## Related Files
- Main component: `packages/ui/src/views/copilot/WorkflowCopilotDock.jsx`
- Quick Config modal: `packages/ui/src/views/copilot/QuickConfigModal.jsx`
- Email preview: `packages/ui/src/views/copilot/EmailPreviewPanel.jsx`
- Backend handler: `packages/server/src/controllers/copilot/index.ts` (autoFix endpoint)


