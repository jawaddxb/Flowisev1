import OpenAI from 'openai'
import logger from '../../utils/logger'

export interface IntentExtractionResult {
    workflow_type: 'research_and_notify' | 'chatflow' | 'rag' | 'unknown'
    extracted: {
        topic?: string | null
        delivery?: 'Email' | 'Slack' | 'Notion' | null
        frequency?: 'Daily' | 'Weekly' | null
        sources?: string[] | null
        timeframe?: string | null
        schedule?: string | null
    }
    confidence: 'high' | 'medium' | 'low'
    clarifications_needed: string[]
}

export class IntentExtractorService {
    private openai: OpenAI | null = null

    constructor() {
        // Try to get OpenAI API key from environment
        const apiKey = process.env.OPENAI_API_KEY
        if (apiKey) {
            this.openai = new OpenAI({ apiKey })
            logger.info('[IntentExtractor] OpenAI client initialized')
        } else {
            logger.warn('[IntentExtractor] OPENAI_API_KEY not found - LLM intent extraction disabled')
        }
    }

    async extractIntent(message: string): Promise<IntentExtractionResult> {
        if (!this.openai) {
            logger.debug('[IntentExtractor] LLM unavailable, returning low confidence')
            return {
                workflow_type: 'unknown',
                extracted: {},
                confidence: 'low',
                clarifications_needed: ['What would you like to build?']
            }
        }

        try {
            const systemPrompt = `You are a workflow intent parser. Extract structured information from user messages about workflow automation.

Return JSON with this exact structure:
{
  "workflow_type": "research_and_notify" | "chatflow" | "rag" | "unknown",
  "extracted": {
    "topic": "the research topic or main subject (string or null)",
    "delivery": "Email" | "Slack" | "Notion" | null,
    "frequency": "Daily" | "Weekly" | null,
    "sources": ["Web", "News", "Twitter", "Reddit", "YouTube"] or null,
    "timeframe": "Today" | "Last 7 days" | null,
    "schedule": "Daily" | "Weekly" | "Run now" | null
  },
  "confidence": "high" | "medium" | "low",
  "clarifications_needed": ["question1", "question2"] or []
}

Examples:

Input: "Track my competitors and notify my team"
Output: {
  "workflow_type": "research_and_notify",
  "extracted": {
    "topic": "competitors",
    "delivery": null,
    "sources": ["Web", "News"],
    "timeframe": "Today",
    "schedule": "Run now"
  },
  "confidence": "medium",
  "clarifications_needed": ["Which delivery method: Email, Slack, or Notion?", "How often should I check for updates?"]
}

Input: "Help me keep up with AI research"
Output: {
  "workflow_type": "research_and_notify",
  "extracted": {
    "topic": "AI research",
    "delivery": null,
    "sources": ["Web", "News"],
    "timeframe": "Today",
    "schedule": null
  },
  "confidence": "medium",
  "clarifications_needed": ["How should I deliver results: Email, Slack, or Notion?", "How often: Daily or Weekly?"]
}

Input: "Monitor trending topics on Twitter and Reddit about climate change"
Output: {
  "workflow_type": "research_and_notify",
  "extracted": {
    "topic": "climate change",
    "delivery": null,
    "sources": ["Twitter", "Reddit"],
    "timeframe": "Today",
    "schedule": null
  },
  "confidence": "high",
  "clarifications_needed": ["How should I deliver results?"]
}

Be precise. Extract what's explicitly stated. Ask clarifying questions for ambiguous parts.`

            logger.debug(`[IntentExtractor] Calling LLM for: "${message.substring(0, 50)}..."`)

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',  // Upgraded from mini for better complex workflow understanding
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 800  // Increased for more detailed extraction
            })

            const content = response.choices[0].message.content || '{}'
            const parsed: IntentExtractionResult = JSON.parse(content)
            
            logger.debug(`[IntentExtractor] LLM result:`, { 
                workflow_type: parsed.workflow_type, 
                confidence: parsed.confidence,
                extractedKeys: Object.keys(parsed.extracted || {})
            })

            return parsed
        } catch (err: any) {
            logger.error('[IntentExtractor] LLM extraction failed:', err.message)
            return {
                workflow_type: 'unknown',
                extracted: {},
                confidence: 'low',
                clarifications_needed: ['Could you describe what you want to build?']
            }
        }
    }
}

export default new IntentExtractorService()

