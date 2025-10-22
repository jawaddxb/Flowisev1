import express from 'express'
import providersController from '../../controllers/orchestrator/providers'
import { checkPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// Provider operations
router.get('/providers', checkPermission('chatflows:view'), providersController.getProviders)
router.get('/providers/:provider/workflows', checkPermission('chatflows:view'), providersController.getProviderWorkflows)
router.get('/providers/:provider/workflows/:workflowId/preview', checkPermission('chatflows:view'), providersController.getWorkflowPreview)

export default router

