import { IconGitMerge } from '@tabler/icons-react'

const icons = {
    IconGitMerge
}

const orchestrator = {
    id: 'orchestrator',
    title: 'Orchestrator',
    type: 'item',
    url: '/orchestrator',
    icon: icons.IconGitMerge,
    breadcrumbs: true,
    permission: 'chatflows:view',
    display: import.meta.env.VITE_ORCHESTRATOR_ENABLED === 'true' ? undefined : 'hidden'
}

export default orchestrator

