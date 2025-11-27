import { GetSecretValueCommand, SecretsManagerClient, type SecretsManagerClientConfig } from '@aws-sdk/client-secrets-manager'

export class SecretsManagerService {
  private client: SecretsManagerClient

  constructor() {
    const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env
    const region = AWS_REGION ?? 'ap-southeast-5'
    const accessKeyId = AWS_ACCESS_KEY_ID ?? ''
    const secretAccessKey = AWS_SECRET_ACCESS_KEY ?? ''

    if (!region) {
      throw new Error('Missing required environment variable: AWS_REGION')
    }

    const clientConfig: SecretsManagerClientConfig = {
      region: region,
    }

    // For local development, use access keys if provided
    // For AWS environments (ECS Fargate), use IAM role via default credential provider
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      }
    }

    this.client = new SecretsManagerClient(clientConfig)
  }

  public async getSecret(secretName: string) {
    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      })

      const response = await this.client.send(command)

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no string value`)
      }

      return JSON.parse(response.SecretString)
    } catch (error) {
      throw new Error(`Failed to retrieve secret ${secretName}: ${(error as Error).message}`)
    }
  }
}
