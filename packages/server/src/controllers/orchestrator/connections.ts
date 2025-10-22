import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ProviderConnection } from '../../database/entities/ProviderConnection'
import n8nProvider from '../../services/orchestrator/providers/n8n'
import { makeProvider } from '../../services/orchestrator/providers/make'
import { zapierProvider } from '../../services/orchestrator/providers/zapier'

const connectProvider = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { provider } = req.params
        const { credentials, name } = req.body
        const workspaceId = req.user?.activeWorkspaceId
        
        if (!workspaceId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Workspace ID required' })
        }
        
        // Get provider adapter
        let providerAdapter
        switch (provider) {
            case 'n8n':
                providerAdapter = n8nProvider
                break
            case 'make':
                providerAdapter = makeProvider
                break
            case 'zapier':
                providerAdapter = zapierProvider
                break
            default:
                return res.status(StatusCodes.BAD_REQUEST).json({ message: `Unknown provider: ${provider}` })
        }
        
        // Test authentication
        const isValid = await providerAdapter.authenticate(credentials)
        if (!isValid) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' })
        }
        
        // Store connection
        const appServer = getRunningExpressApp()
        const connection = new ProviderConnection()
        connection.workspaceId = workspaceId
        connection.provider = provider
        connection.credentials = JSON.stringify(credentials)
        connection.status = 'ACTIVE'
        
        await appServer.AppDataSource.getRepository(ProviderConnection).save(connection)
        
        return res.status(StatusCodes.CREATED).json({
            id: connection.id,
            provider: connection.provider,
            status: connection.status,
            createdDate: connection.createdDate
        })
    } catch (error) {
        next(error)
    }
}

const disconnectProvider = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const workspaceId = req.user?.activeWorkspaceId
        
        const appServer = getRunningExpressApp()
        const connection = await appServer.AppDataSource.getRepository(ProviderConnection).findOne({
            where: { id, workspaceId }
        })
        
        if (!connection) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Connection not found' })
        }
        
        await appServer.AppDataSource.getRepository(ProviderConnection).remove(connection)
        
        return res.status(StatusCodes.NO_CONTENT).send()
    } catch (error) {
        next(error)
    }
}

const testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { provider } = req.params
        const { credentials } = req.body
        
        // Get provider adapter
        let providerAdapter
        switch (provider) {
            case 'n8n':
                providerAdapter = n8nProvider
                break
            case 'make':
                providerAdapter = makeProvider
                break
            case 'zapier':
                providerAdapter = zapierProvider
                break
            default:
                return res.status(StatusCodes.BAD_REQUEST).json({ message: `Unknown provider: ${provider}` })
        }
        
        // Test authentication
        const isValid = await providerAdapter.authenticate(credentials)
        
        return res.json({ valid: isValid })
    } catch (error) {
        next(error)
    }
}

const listConnections = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = req.user?.activeWorkspaceId
        
        const appServer = getRunningExpressApp()
        const connections = await appServer.AppDataSource.getRepository(ProviderConnection).find({
            where: { workspaceId },
            order: { createdDate: 'DESC' }
        })
        
        // Return without credentials
        const sanitized = connections.map(conn => ({
            id: conn.id,
            provider: conn.provider,
            status: conn.status,
            lastSync: conn.lastSync,
            createdDate: conn.createdDate,
            updatedDate: conn.updatedDate
        }))
        
        return res.json(sanitized)
    } catch (error) {
        next(error)
    }
}

export default {
    connectProvider,
    disconnectProvider,
    testConnection,
    listConnections
}

