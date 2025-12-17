import { env } from '../config/env.config'

function buildRevalidateUrl(servicePath: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(servicePath)) {
    throw new Error('Invalid servicePath: must only contain letters, numbers, dashes, and underscores')
  }
  return new URL(`/${servicePath}`, env.DATAPROC_SERVICE_URL).toString()
}

export async function revalidateSchoolEntitiesService(servicePath: string): Promise<void> {
  const endpoint = buildRevalidateUrl(servicePath)
  const response = await fetch(endpoint, { method: 'POST' })

  if (!response.ok) {
    throw new Error(`Dataproc service returned unexpected status ${response.status}`)
  }
}
