import { Request, Response, NextFunction } from 'express'
import { getDataSource } from '../../DataSource'
import { CopilotConversation } from '../../database/entities/CopilotConversation'
import { CopilotMessage } from '../../database/entities/CopilotMessage'
import { CopilotState } from '../../database/entities/CopilotState'

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId } = req.params
        if (!flowId) return res.status(400).json({ message: 'flowId required' })
        const ds = getDataSource()
        const convoRepo = ds.getRepository(CopilotConversation)
        const msgRepo = ds.getRepository(CopilotMessage)
        const convo = await convoRepo.findOne({ where: { flowId }, order: { updatedAt: 'DESC' } })
        if (!convo) return res.json({ conversation: null, messages: [] })
        const messages = await msgRepo.find({ where: { conversationId: convo.id }, order: { createdAt: 'ASC' } })
        return res.json({ conversation: convo, messages })
    } catch (err: any) {
        const m = String(err?.message || '')
        if (m.includes('no such table') || (m.includes('relation') && m.includes('does not exist'))) {
            return res.json({ conversation: null, messages: [] })
        }
        next(err)
    }
}

export const clearHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId } = req.params
        if (!flowId) return res.status(400).json({ message: 'flowId required' })
        const ds = getDataSource()
        const convoRepo = ds.getRepository(CopilotConversation)
        const msgRepo = ds.getRepository(CopilotMessage)
        const stateRepo = ds.getRepository(CopilotState)
        
        // Clear conversations and messages
        const convos = await convoRepo.find({ where: { flowId } })
        for (const c of convos) await msgRepo.delete({ conversationId: c.id })
        await convoRepo.delete({ flowId })
        
        // Also clear CopilotState (to remove old answers like "Cats")
        await stateRepo.delete({ flowId })
        
        return res.json({ success: true })
    } catch (err) {
        next(err)
    }
}


