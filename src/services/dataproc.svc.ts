import { env } from '../config/env.config'

function buildRevalidateUrl(servicePath: string): string {
  return new URL(`/${servicePath}`, env.DATAPROC_SERVICE_URL).toString()
}

export async function revalidateSchoolEntitiesService(servicePath: string): Promise<void> {
  const endpoint = buildRevalidateUrl(servicePath)
  const response = await fetch(endpoint, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Dataproc service returned unexpected status ${response.status}`)
  }
}
