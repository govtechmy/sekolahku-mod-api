import { env } from '../config/env.config'

const REVALIDATE_PATH = '/revalidate-school-entity'

function buildRevalidateUrl(): string {
  return new URL(REVALIDATE_PATH, env.DATAPROC_SERVICE_URL).toString()
}

export async function revalidateSchoolEntitiesService(): Promise<void> {
  const endpoint = buildRevalidateUrl()
  const response = await fetch(endpoint, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Dataproc service returned unexpected status ${response.status}`)
  }
}
