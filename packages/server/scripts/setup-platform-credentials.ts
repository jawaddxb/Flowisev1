/**
 * Platform Credential Provisioning Script
 * Run once during deployment to create workspace-managed credentials
 * 
 * Usage: node dist/scripts/setup-platform-credentials.js
 */

import { DataSource } from 'typeorm'
import { Credential } from '../src/database/entities/Credential'
import { getEncryptionKey } from '../src/utils'
import * as crypto from 'crypto'

const algorithm = 'aes-256-ctr'

function encrypt(text: string, encryptionKey: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, 'hex'), iv)
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

async function provisionPlatformCredentials() {
    console.log('🚀 Starting platform credential provisioning...')

    // Platform API keys from environment
    const platformCreds = [
        { 
            name: 'serperApi', 
            apiKey: process.env.PLATFORM_SERPER_KEY,
            label: 'Serper (Platform)'
        },
        { 
            name: 'firecrawlApi', 
            apiKey: process.env.PLATFORM_FIRECRAWL_KEY,
            label: 'FireCrawl (Platform)'
        },
        { 
            name: 'resendApi', 
            apiKey: process.env.PLATFORM_RESEND_KEY,
            label: 'Resend (Platform)',
            extra: { fromEmail: process.env.PLATFORM_FROM_EMAIL || 'noreply@yourdomain.com' }
        },
        { 
            name: 'openRouterApi', 
            apiKey: process.env.PLATFORM_OPENROUTER_KEY,
            label: 'OpenRouter (Platform)'
        },
        { 
            name: 'braveSearchApi', 
            apiKey: process.env.PLATFORM_BRAVE_KEY,
            label: 'Brave Search (Platform)'
        }
    ]

    // Get encryption key
    const encryptionKey = getEncryptionKey()
    
    // Connect to database (use same config as main app)
    const AppDataSource = new DataSource({
        type: (process.env.DATABASE_TYPE as any) || 'sqlite',
        database: process.env.DATABASE_PATH || `${process.cwd()}/database.sqlite`,
        synchronize: false,
        entities: [Credential],
        migrations: [],
        logging: false
    })

    try {
        await AppDataSource.initialize()
        console.log('✅ Database connected')

        const credRepo = AppDataSource.getRepository(Credential)

        for (const cred of platformCreds) {
            if (!cred.apiKey) {
                console.log(`⚠️  Skipping ${cred.name}: API key not found in environment`)
                continue
            }

            // Check if credential already exists
            const existing = await credRepo.findOne({
                where: { 
                    credentialName: cred.name,
                    workspaceId: 'platform'  // Platform workspace ID
                }
            })

            if (existing) {
                console.log(`✓ ${cred.label}: Already exists`)
                continue
            }

            // Create credential data object
            const credentialData: any = { apiKey: cred.apiKey }
            if (cred.extra) {
                Object.assign(credentialData, cred.extra)
            }

            // Encrypt the credential data
            const encryptedData = encrypt(JSON.stringify(credentialData), encryptionKey)

            // Create new credential
            const newCred = credRepo.create({
                name: cred.label,
                credentialName: cred.name,
                encryptedData,
                workspaceId: 'platform'  // Mark as platform-managed
            })

            await credRepo.save(newCred)
            console.log(`✅ ${cred.label}: Created successfully`)
        }

        console.log('\n🎉 Platform credential provisioning complete!')
        console.log('\n📝 Summary:')
        const allCreds = await credRepo.find({ where: { workspaceId: 'platform' } })
        allCreds.forEach(c => {
            console.log(`   - ${c.name} (${c.credentialName})`)
        })

    } catch (error) {
        console.error('❌ Error provisioning credentials:', error)
        process.exit(1)
    } finally {
        await AppDataSource.destroy()
    }
}

// Run if executed directly
if (require.main === module) {
    provisionPlatformCredentials()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal error:', err)
            process.exit(1)
        })
}

export { provisionPlatformCredentials }


