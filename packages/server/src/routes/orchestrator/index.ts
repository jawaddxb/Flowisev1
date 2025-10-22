import express from 'express'
import orchestratorController from '../../controllers/orchestrator'
import { checkPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// CRUD operations
router.get('/', checkPermission('chatflows:view'), orchestratorController.getAllOrchestrators)
router.post('/', checkPermission('chatflows:create'), orchestratorController.createOrchestrator)
router.get('/:id', checkPermission('chatflows:view'), orchestratorController.getOrchestrator)
router.put('/:id', checkPermission('chatflows:update'), orchestratorController.updateOrchestrator)
router.delete('/:id', checkPermission('chatflows:delete'), orchestratorController.deleteOrchestrator)

// Run operations
router.post('/:id/run', checkPermission('chatflows:view'), orchestratorController.runOrchestrator)
router.get('/:id/runs', checkPermission('chatflows:view'), orchestratorController.getOrchestratorRuns)

// Callback endpoint (no auth required as it's called by external systems with token)
router.post('/callback/:token', orchestratorController.handleCallback)

export default router

