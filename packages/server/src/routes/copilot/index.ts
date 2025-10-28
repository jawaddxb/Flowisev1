import express from 'express'
import copilotController, { classifyAndPlan, clarify, capabilities, chat, undo, autoApply, review, annotate, replace, autoFix, interpretIntent, compileWorkflow } from '../../controllers/copilot'
import { getHistory, clearHistory } from '../../controllers/copilot/history'
const router = express.Router()

router.post('/generate', copilotController.generate)
router.post('/plan-edits', copilotController.planEdits)
router.post('/apply', copilotController.apply)
router.post('/undo/:flowId', undo)
router.post('/classify-and-plan', classifyAndPlan)
router.post('/clarify', clarify)
router.get('/capabilities', capabilities)
router.get('/history/:flowId', getHistory)
router.post('/history/:flowId/clear', clearHistory)
router.post('/chat', chat)
router.post('/auto-apply', autoApply)
router.post('/review', review)
router.post('/annotate', annotate)
router.post('/replace', replace)
router.post('/auto-fix', autoFix)
router.post('/interpret-intent', interpretIntent)
router.post('/compile-workflow', compileWorkflow)

export default router


