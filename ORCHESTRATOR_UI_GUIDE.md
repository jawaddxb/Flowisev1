# Orchestrator Canvas - UI Guide

## What You Should See

When you navigate to `http://localhost:3000/orchestrator/canvas`, you should see:

### 1. Top Toolbar
```
[← Back]  [Untitled Orchestrator ________]  [+ Add Workflow]  [▶ Run]  [💾 Save]
```

### 2. Left Sidebar - Node Palette
```
┌─────────────────────────┐
│ Node Palette           │
├─────────────────────────┤
│ 🔌 Remote Webhook      │
│ Call external webhook  │
├─────────────────────────┤
│ 🌿 Local Flow          │
│ Execute Flowise flow   │
├─────────────────────────┤
│ ⚡ Data Mapper          │
│ Transform data         │
├─────────────────────────┤
│ ⏰ Wait for Callback    │
│ Pause for webhook      │
├─────────────────────────┤
│ 🔀 Condition           │
│ Conditional branch     │
├─────────────────────────┤
│ ⚠️  Error Handler       │
│ Handle errors          │
├─────────────────────────┤
│ 📦 Parallel            │
│ Run in parallel        │
└─────────────────────────┘
```

### 3. Main Canvas Area
- Large empty grid area
- Light gray dots/grid pattern
- Zoom controls in bottom right
- Mini-map in bottom left
- **THIS WILL BE BLANK** for a new orchestrator (that's correct!)

---

## How to Use the Canvas

### Creating Your First Orchestrator

1. **Drag a Node**
   - From the left palette, drag "Remote Webhook" or "Local Flow" to the canvas
   - Drop it anywhere on the grid

2. **Add More Nodes**
   - Drag additional nodes as needed
   - Each node appears as a box with its label

3. **Connect Nodes**
   - Click and drag from the edge of one node to another
   - This creates an arrow/connection between them

4. **Configure Nodes**
   - Click on any node to open the configuration drawer
   - Set properties like URL, method, timeout, etc.

5. **Save Your Orchestrator**
   - Click the "Save" button in the toolbar
   - Give it a name
   - Click "Save" in the dialog

6. **Run Your Orchestrator**
   - Click the "Run" button
   - Provide input data (JSON)
   - View the execution results

---

## Common Questions

### "I see a blank canvas - is this normal?"
**YES!** A new orchestrator starts empty. You need to:
1. Drag nodes from the left palette
2. Connect them together
3. Configure each node
4. Save the orchestrator

### "How do I add workflows from n8n/Make/Zapier?"
1. Click "Add Workflow" button in toolbar
2. Select the provider tab (Local Flows, n8n, Make, Zapier)
3. Click "Connect" if not already connected
4. Select a workflow from the list
5. Click "Add to Canvas"

### "The nodes look weird"
Make sure:
- You've cleared your browser cache (Cmd+Shift+R)
- ReactFlow CSS is loading properly
- You're using a modern browser (Chrome, Firefox, Edge)

### "I can't drag nodes"
- Make sure you're clicking and holding on the node in the palette
- Drag it to the empty canvas area
- Release to drop

---

## What's What

### Toolbar Buttons

- **← Back**: Return to orchestrator list
- **Name Field**: Edit orchestrator name
- **+ Add Workflow**: Open workflow browser (for external workflows)
- **▶ Run**: Execute the orchestrator
- **💾 Save**: Save your changes

### Node Types

- **Remote Webhook**: Call external APIs/webhooks (n8n, Make, Zapier, etc.)
- **Local Flow**: Execute an existing Flowise chatflow
- **Data Mapper**: Transform data between nodes
- **Wait for Callback**: Pause until external system calls back
- **Condition**: Branch based on data conditions
- **Error Handler**: Catch and handle errors
- **Parallel**: Run multiple nodes simultaneously

---

## Quick Start Example

### Create a Simple Orchestrator

1. **Drag "Local Flow"** to canvas
2. **Click on it** to configure
   - Select a Flowise chatflow from dropdown
3. **Drag "Data Mapper"** to canvas
4. **Connect** Local Flow → Data Mapper
5. **Click "Save"**
6. **Click "Run"** with test data

---

## Troubleshooting

### Canvas is completely empty (no grid, no controls)
- Check browser console for errors (F12)
- Hard refresh the page (Cmd+Shift+R)
- Try incognito mode

### Can't see the node palette
- Widen your browser window
- Check if sidebar is collapsed
- Refresh the page

### Nodes don't appear when dragged
- Check that you're dropping on the canvas (not the sidebar)
- Try clicking on the canvas first to focus it
- Refresh and try again

### Save button doesn't work
- Make sure you have at least one node
- Check that orchestrator has a name
- Check browser console for errors

---

## Expected Behavior

✅ **Normal:** Empty canvas when creating new orchestrator  
✅ **Normal:** Seeing grid pattern with no nodes  
✅ **Normal:** Toolbar and sidebar visible  
✅ **Normal:** Can drag nodes from palette  

❌ **Problem:** Completely blank white page  
❌ **Problem:** No toolbar or sidebar  
❌ **Problem:** 500 errors in console  
❌ **Problem:** Nodes don't appear when dropped  

---

## Next Steps

Once you see the canvas:

1. **Try dragging a node** to verify drag-and-drop works
2. **Save it** to verify database connection works
3. **Connect to a provider** (n8n/Make/Zapier) to test integrations
4. **Run a simple orchestrator** to test execution

If you're seeing the toolbar, sidebar, and empty canvas - **everything is working correctly!** The canvas is supposed to be empty until you add nodes.

---

**Current Status:** ✅ Fully Operational  
**Server:** Running on port 3000  
**Database:** All tables created  
**UI:** Canvas ready for use

