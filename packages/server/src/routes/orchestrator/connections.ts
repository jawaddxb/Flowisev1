import express from 'express'
import connectionsController from '../../controllers/orchestrator/connections'
import { checkPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// Connection management
router.get('/connections', checkPermission('chatflows:view'), connectionsController.listConnections)
router.post('/providers/:provider/connect', checkPermission('chatflows:create'), connectionsController.connectProvider)
router.delete('/connections/:id', checkPermission('chatflows:delete'), connectionsController.disconnectProvider)
router.post('/providers/:provider/test', checkPermission('chatflows:view'), connectionsController.testConnection)

export default router

