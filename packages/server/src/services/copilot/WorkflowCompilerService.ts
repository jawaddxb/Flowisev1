import OpenAI from 'openai'
import logger from '../../utils/logger'

export interface PrimitiveNode {
    id: string
    primitive: 'data_source' | 'processor' | 'ai_agent' | 'integrator' | 'controller' | 'storage' | 'communicator'
    label: string
    implementation: string
    inputs: string[]
    config: {
        [key: string]: any
        needsUserInput?: string[]
        credential?: string
    }
    parallel_group?: number | null
    position_hint?: { x: number; y: number }
}

export interface WorkflowSpec {
    workflow: {
        name: string
        pattern: string
        description: string
        nodes: PrimitiveNode[]
        credentials_needed: Array<{
            service: string
            type: 'oauth' | 'api_key' | 'bot_token'
            personal: boolean
        }>
        questions_for_user: Array<{
            field: string
            question: string
            type: 'text' | 'number' | 'choice' | 'multiselect'
            options?: string[]
            default?: any
            required?: boolean
        }>
        estimated_cost: {
            predictions_per_run: number
            external_api_calls: number
            complexity: 'low' | 'medium' | 'high'
        }
    }
}

export interface WorkflowContext {
    existingAnswers?: Record<string, any>
    flowData?: any
}

export class WorkflowCompilerService {
    private openai: OpenAI | null = null

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY
        if (apiKey) {
            this.openai = new OpenAI({ apiKey })
            logger.info('[WorkflowCompiler] OpenAI client initialized with GPT-4o')
        } else {
            logger.warn('[WorkflowCompiler] OPENAI_API_KEY not found - workflow compilation disabled')
        }
    }

    async compileWorkflow(userIntent: string, context?: WorkflowContext): Promise<WorkflowSpec> {
        if (!this.openai) {
            logger.debug('[WorkflowCompiler] LLM unavailable, returning fallback')
            return this.getFallbackSpec(userIntent)
        }

        try {
            const systemPrompt = this.buildSystemPrompt()
            const userPrompt = this.buildUserPrompt(userIntent, context)

            logger.debug(`[WorkflowCompiler] Compiling workflow for: "${userIntent.substring(0, 100)}..."`)

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 2000
            })

            const content = response.choices[0].message.content || '{}'
            const parsed: WorkflowSpec = JSON.parse(content)

            logger.info('[WorkflowCompiler] Compilation successful', {
                pattern: parsed.workflow?.pattern,
                nodeCount: parsed.workflow?.nodes?.length,
                credentialsNeeded: parsed.workflow?.credentials_needed?.length
            })

            return parsed
        } catch (err: any) {
            logger.error('[WorkflowCompiler] Compilation failed:', err.message)
            return this.getFallbackSpec(userIntent)
        }
    }

    private buildSystemPrompt(): string {
        return `You are a workflow compiler. Decompose user intent into primitive building blocks and generate executable workflow specifications.

PRIMITIVES (7 Categories):

1. **data_source** - Inputs that fetch or receive data
   Implementations: twitter, youtube, gmail, shopify, calendar, rss, webhook, sensors, stripe, hubspot, typeform, google_sheets, airtable, etc.

2. **processor** - Data transformation and filtering
   Implementations: filter, parser, json_transformer, aggregator, comparator, calculator, validator, extractor, formatter, etc.

3. **ai_agent** - AI/ML operations
   Implementations: sentiment_analysis, text_generation, classification, image_generation, transcription, translation, summarization, qa, etc.

4. **integrator** - External API calls and actions
   Implementations: api_call, oauth_action, database_query, blockchain_transaction, file_upload, http_request, etc.

5. **controller** - Flow control and orchestration
   Implementations: time_filter, conditional_branch, parallel_executor, loop, rate_limiter, scheduler, delay, etc.

6. **storage** - Data persistence
   Implementations: postgres, mongodb, redis, file_system, blockchain, s3, notion, airtable, etc.

7. **communicator** - Outputs and notifications
   Implementations: email, slack, discord, telegram, sms, whatsapp, webhook, push_notification, blog, social_media, etc.

WORKFLOW PATTERNS:
- research_notify: Search → Analyze → Deliver (e.g., daily AI research emails)
- content_pipeline: Source → Transform → Publish (e.g., YouTube → transcribe → blog)
- crm_sync: CRM Event → Enrich → Update/Notify (e.g., Typeform → Notion → Email)
- trigger_action: Event → Condition → Action (e.g., Shopify → AI caption → Social)
- scheduled_report: Fetch → Summarize → Deliver (e.g., Stripe → daily summary)
- trading_bot: Monitor → Analyze → Execute (e.g., Twitter sentiment → trades)
- rag: Documents → Index → Q&A (e.g., knowledge base chat)
- classification: Input → Classify → Route (e.g., support tickets)
- custom: Any other pattern

RULES:
1. Break workflows into atomic, composable steps
2. Identify clear dependencies (inputs/outputs between nodes)
3. Detect parallel execution (nodes that can run simultaneously - same parallel_group)
4. Flag conditional logic (time-based, value-based, conditional branches)
5. Extract ALL user input needs (ask for specifics, don't assume)
6. Classify credentials as platform-managed (search APIs, AI models) vs personal (Gmail, CRMs, social)
7. Estimate cost based on AI calls and external APIs
8. Use position_hint for visual layout (left-to-right flow, 250px spacing)

OUTPUT JSON STRUCTURE:
{
  "workflow": {
    "name": "Brief workflow name",
    "pattern": "One of the patterns above",
    "description": "One sentence summary",
    "nodes": [
      {
        "id": "unique_node_id",
        "primitive": "data_source | processor | ai_agent | integrator | controller | storage | communicator",
        "label": "Human-readable node label",
        "implementation": "twitter | gmail | sentiment_analysis | api_call | time_filter | postgres | email | etc.",
        "inputs": ["node_id_that_feeds_this"],
        "config": {
          "key": "value or {{variable_name}}",
          "needsUserInput": ["field1", "field2"]
        },
        "parallel_group": null or 1,
        "position_hint": { "x": 100, "y": 100 }
      }
    ],
    "credentials_needed": [
      { "service": "Service Name", "type": "oauth | api_key | bot_token", "personal": true or false }
    ],
    "questions_for_user": [
      { "field": "field_id", "question": "What ...", "type": "text | number | choice | multiselect", "options": ["A", "B"], "default": "A", "required": true }
    ],
    "estimated_cost": {
      "predictions_per_run": 2,
      "external_api_calls": 5,
      "complexity": "low | medium | high"
    }
  }
}

EXAMPLES:

Input: "Send me daily AI research via email"
Output:
{
  "workflow": {
    "name": "Daily AI Research Email",
    "pattern": "research_notify",
    "description": "Search web for AI research daily and deliver via email",
    "nodes": [
      { "id": "search_web", "primitive": "data_source", "label": "Web Search", "implementation": "web_search", "inputs": [], "config": { "query": "{{topic}}", "needsUserInput": ["topic"] }, "position_hint": { "x": 100, "y": 100 } },
      { "id": "scrape_pages", "primitive": "processor", "label": "Web Scraper", "implementation": "web_scraper", "inputs": ["search_web"], "config": { "maxPages": 5 }, "position_hint": { "x": 350, "y": 100 } },
      { "id": "summarize", "primitive": "ai_agent", "label": "AI Summarizer", "implementation": "summarization", "inputs": ["scrape_pages"], "config": { "model": "gpt-4o-mini" }, "position_hint": { "x": 600, "y": 100 } },
      { "id": "send_email", "primitive": "communicator", "label": "Email Sender", "implementation": "email", "inputs": ["summarize"], "config": { "provider": "platform", "subject": "{{topic}} Update" }, "position_hint": { "x": 850, "y": 100 } }
    ],
    "credentials_needed": [
      { "service": "Web Search", "type": "api_key", "personal": false },
      { "service": "Email", "type": "api_key", "personal": false }
    ],
    "questions_for_user": [
      { "field": "topic", "question": "What topic should I research?", "type": "text", "required": true },
      { "field": "frequency", "question": "How often?", "type": "choice", "options": ["Daily", "Weekly"], "default": "Daily", "required": false }
    ],
    "estimated_cost": { "predictions_per_run": 1, "external_api_calls": 2, "complexity": "low" }
  }
}

Input: "When new YouTube video published → Whisper transcript → GPT summary → post to blog"
Output:
{
  "workflow": {
    "name": "YouTube to Blog Pipeline",
    "pattern": "content_pipeline",
    "description": "Automatically transcribe, summarize, and publish YouTube videos to blog",
    "nodes": [
      { "id": "youtube_monitor", "primitive": "data_source", "label": "YouTube Monitor", "implementation": "youtube", "inputs": [], "config": { "channel": "{{channel_id}}", "needsUserInput": ["channel_id"] }, "position_hint": { "x": 100, "y": 100 } },
      { "id": "transcribe", "primitive": "ai_agent", "label": "Whisper Transcription", "implementation": "transcription", "inputs": ["youtube_monitor"], "config": { "model": "whisper-1" }, "position_hint": { "x": 350, "y": 100 } },
      { "id": "summarize", "primitive": "ai_agent", "label": "GPT Summarizer", "implementation": "summarization", "inputs": ["transcribe"], "config": { "model": "gpt-4o-mini" }, "position_hint": { "x": 600, "y": 100 } },
      { "id": "publish_blog", "primitive": "communicator", "label": "Blog Publisher", "implementation": "blog", "inputs": ["summarize"], "config": { "platform": "{{blog_platform}}", "needsUserInput": ["blog_platform", "blog_url"] }, "position_hint": { "x": 850, "y": 100 } }
    ],
    "credentials_needed": [
      { "service": "YouTube", "type": "oauth", "personal": true },
      { "service": "OpenAI", "type": "api_key", "personal": false },
      { "service": "Blog", "type": "api_key", "personal": true }
    ],
    "questions_for_user": [
      { "field": "channel_id", "question": "Which YouTube channel?", "type": "text", "required": true },
      { "field": "blog_platform", "question": "Blog platform?", "type": "choice", "options": ["WordPress", "Ghost", "Medium", "Custom"], "required": true },
      { "field": "blog_url", "question": "Blog API URL", "type": "text", "required": true }
    ],
    "estimated_cost": { "predictions_per_run": 2, "external_api_calls": 3, "complexity": "medium" }
  }
}

Input: "Post Shopify product to Instagram, LinkedIn, Twitter with AI captions"
Output:
{
  "workflow": {
    "name": "Shopify Social Media Automation",
    "pattern": "trigger_action",
    "description": "Auto-post new Shopify products to social media with AI-generated captions",
    "nodes": [
      { "id": "shopify_webhook", "primitive": "data_source", "label": "Shopify New Product", "implementation": "shopify", "inputs": [], "config": { "event": "product/create" }, "position_hint": { "x": 100, "y": 100 } },
      { "id": "generate_caption", "primitive": "ai_agent", "label": "AI Caption Generator", "implementation": "text_generation", "inputs": ["shopify_webhook"], "config": { "prompt": "Generate engaging social media caption for: {{product_name}}" }, "position_hint": { "x": 350, "y": 100 } },
      { "id": "post_instagram", "primitive": "communicator", "label": "Instagram Post", "implementation": "social_media", "inputs": ["generate_caption"], "config": { "platform": "instagram" }, "parallel_group": 1, "position_hint": { "x": 600, "y": 50 } },
      { "id": "post_linkedin", "primitive": "communicator", "label": "LinkedIn Post", "implementation": "social_media", "inputs": ["generate_caption"], "config": { "platform": "linkedin" }, "parallel_group": 1, "position_hint": { "x": 600, "y": 150 } },
      { "id": "post_twitter", "primitive": "communicator", "label": "Twitter Post", "implementation": "social_media", "inputs": ["generate_caption"], "config": { "platform": "twitter" }, "parallel_group": 1, "position_hint": { "x": 600, "y": 250 } }
    ],
    "credentials_needed": [
      { "service": "Shopify", "type": "api_key", "personal": true },
      { "service": "OpenAI", "type": "api_key", "personal": false },
      { "service": "Instagram", "type": "oauth", "personal": true },
      { "service": "LinkedIn", "type": "oauth", "personal": true },
      { "service": "Twitter", "type": "oauth", "personal": true }
    ],
    "questions_for_user": [],
    "estimated_cost": { "predictions_per_run": 1, "external_api_calls": 4, "complexity": "medium" }
  }
}

Be precise. Extract what's stated. Ask for missing details. Think step-by-step about data flow.`
    }

    private buildUserPrompt(userIntent: string, context?: WorkflowContext): string {
        let prompt = `User Intent: "${userIntent}"\n`

        if (context && context.existingAnswers && Object.keys(context.existingAnswers).length > 0) {
            prompt += `\nExisting Answers (preserve and extend):\n${JSON.stringify(context.existingAnswers, null, 2)}\n`
        }

        if (context && context.flowData && context.flowData.nodes && context.flowData.nodes.length > 0) {
            prompt += `\nExisting Canvas: ${context.flowData.nodes.length} nodes already present (user may be adding to existing workflow)\n`
        }

        prompt += '\nGenerate the workflow specification:'

        return prompt
    }

    private getFallbackSpec(userIntent: string): WorkflowSpec {
        // Fallback when LLM unavailable - return minimal research workflow
        logger.warn('[WorkflowCompiler] Using fallback spec (LLM unavailable)')
        return {
            workflow: {
                name: 'Custom Workflow',
                pattern: 'custom',
                description: userIntent.substring(0, 100),
                nodes: [
                    {
                        id: 'manual_setup',
                        primitive: 'ai_agent',
                        label: 'AI Assistant',
                        implementation: 'chatbot',
                        inputs: [],
                        config: {
                            needsUserInput: ['goal']
                        },
                        position_hint: { x: 100, y: 100 }
                    }
                ],
                credentials_needed: [
                    { service: 'AI Model', type: 'api_key', personal: false }
                ],
                questions_for_user: [
                    { field: 'goal', question: 'What should this workflow do?', type: 'text', required: true }
                ],
                estimated_cost: {
                    predictions_per_run: 1,
                    external_api_calls: 0,
                    complexity: 'low'
                }
            }
        }
    }
}

export default new WorkflowCompilerService()

