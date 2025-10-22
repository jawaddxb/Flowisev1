import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Orchestrator } from '../../database/entities/Orchestrator'
import { OrchestratorRun } from '../../database/entities/OrchestratorRun'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import orchestratorRunner from './runner'

const getAllOrchestrators = async (workspaceId?: string): Promise<Orchestrator[]> => {
    const appServer = getRunningExpressApp()
    const query = appServer.AppDataSource.getRepository(Orchestrator).createQueryBuilder('orchestrator')

    if (workspaceId) {
        query.where('orchestrator.workspaceId = :workspaceId', { workspaceId })
    }

    return await query.orderBy('orchestrator.updatedDate', 'DESC').getMany()
}

const getOrchestrator = async (id: string): Promise<Orchestrator> => {
    const appServer = getRunningExpressApp()
    const orchestrator = await appServer.AppDataSource.getRepository(Orchestrator).findOneBy({ id })

    if (!orchestrator) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Orchestrator ${id} not found`)
    }

    return orchestrator
}

const createOrchestrator = async (data: Partial<Orchestrator>, workspaceId?: string): Promise<Orchestrator> => {
    const appServer = getRunningExpressApp()
    const newOrchestrator = new Orchestrator()
    Object.assign(newOrchestrator, data)
    
    if (workspaceId) {
        newOrchestrator.workspaceId = workspaceId
    }

    const orchestrator = await appServer.AppDataSource.getRepository(Orchestrator).save(newOrchestrator)
    return orchestrator
}

const updateOrchestrator = async (id: string, data: Partial<Orchestrator>): Promise<Orchestrator> => {
    const appServer = getRunningExpressApp()
    const orchestrator = await getOrchestrator(id)
    
    Object.assign(orchestrator, data)
    await appServer.AppDataSource.getRepository(Orchestrator).save(orchestrator)
    
    return orchestrator
}

const deleteOrchestrator = async (id: string): Promise<void> => {
    const appServer = getRunningExpressApp()
    const orchestrator = await getOrchestrator(id)
    
    await appServer.AppDataSource.getRepository(Orchestrator).remove(orchestrator)
}

const runOrchestrator = async (id: string, inputs: any): Promise<OrchestratorRun> => {
    const appServer = getRunningExpressApp()
    const orchestrator = await getOrchestrator(id)
    
    // Create run record
    const run = new OrchestratorRun()
    run.orchestratorId = id
    run.status = 'RUNNING'
    run.startedAt = new Date()
    run.correlationToken = uuidv4()
    run.logs = JSON.stringify([{ timestamp: new Date(), message: 'Starting orchestration' }])
    
    const savedRun = await appServer.AppDataSource.getRepository(OrchestratorRun).save(run)
    
    // Execute orchestration asynchronously
    orchestratorRunner.execute(orchestrator, savedRun, inputs).catch((error) => {
        console.error('Orchestration execution error:', error)
    })
    
    return savedRun
}

const getOrchestratorRuns = async (orchestratorId: string): Promise<OrchestratorRun[]> => {
    const appServer = getRunningExpressApp()
    return await appServer.AppDataSource.getRepository(OrchestratorRun)
        .find({
            where: { orchestratorId },
            order: { createdDate: 'DESC' }
        })
}

const handleCallback = async (token: string, data: any): Promise<void> => {
    const appServer = getRunningExpressApp()
    const run = await appServer.AppDataSource.getRepository(OrchestratorRun).findOne({
        where: { correlationToken: token }
    })
    
    if (!run) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Run with token ${token} not found`)
    }
    
    // Resume orchestration with callback data
    await orchestratorRunner.resumeFromCallback(run, data)
}

export default {
    getAllOrchestrators,
    getOrchestrator,
    createOrchestrator,
    updateOrchestrator,
    deleteOrchestrator,
    runOrchestrator,
    getOrchestratorRuns,
    handleCallback
}

