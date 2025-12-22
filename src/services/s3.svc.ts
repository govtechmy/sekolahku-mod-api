import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface PutPresignedUrlOptions {
  key: string
  contentType: string
  expiresIn?: number
}

export interface GetPresignedUrlOptions {
  key: string
  expiresIn?: number
}

export class S3Service {
  private s3Client: S3Client
  private bucket: string = ''

  constructor() {
    const { AWS_REGION, S3_BUCKET_NAME } = process.env
    const region = AWS_REGION ?? 'ap-southeast-5'
    const bucket = S3_BUCKET_NAME ?? ''

    if (!region) {
      throw new Error('Missing required environment variable: AWS_REGION')
    }
    if (!bucket) {
      throw new Error('Missing required environment variable: S3_BUCKET_NAME')
    }

    this.bucket = bucket

    const s3Config: S3ClientConfig = {
      region: region,
    }

    this.s3Client = new S3Client(s3Config)
  }

  public getS3ObjectUrl(key: string) {
    return `s3://${this.bucket}/${key}`
  }

  public async generatePutPresignedUrl(options: PutPresignedUrlOptions) {
    const { key, expiresIn = 3600, contentType } = options
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn })
      return signedUrl
    } catch (error) {
      const errorMsg = error && typeof error === 'object' && 'message' in error ? error.message : JSON.stringify(error)
      throw new Error(`Failed to generate presigned URL: ${errorMsg}`)
    }
  }

  public async generateGetPresignedUrl(options: GetPresignedUrlOptions) {
    const { key, expiresIn = 3600 } = options
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn })
      return signedUrl
    } catch (error) {
      const errorMsg = error && typeof error === 'object' && 'message' in error ? error.message : JSON.stringify(error)
      throw new Error(`Failed to generate presigned URL: ${errorMsg}`)
    }
  }

  public extractKeyFromUrl(url: string) {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname // e.g., /bucket-name/key
      const parts = pathname.split('/')
      // Remove the first empty string and the bucket name
      parts.shift() // Remove leading empty string
      parts.shift() // Remove bucket name
      const key = parts.join('/')
      return key
    } catch (error) {
      const errorMsg = error && typeof error === 'object' && 'message' in error ? error.message : JSON.stringify(error)
      throw new Error(`Failed to extract key from URL: ${errorMsg}`)
    }
  }

  public async moveObject(fromPath: string, toPath: string) {
    const copyCommand = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${fromPath}`,
      Key: toPath,
    })

    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fromPath,
    })

    try {
      await this.s3Client.send(copyCommand)
      await this.s3Client.send(deleteCommand)
    } catch (error) {
      const errorMsg = error && typeof error === 'object' && 'message' in error ? error.message : JSON.stringify(error)
      throw new Error(`Failed to move object in S3: ${errorMsg}`)
    }
  }

  public async getObjectUrl(key: string) {
    const newUrl = await this.generateGetPresignedUrl({ key })
    //remove the query params to make it a permanent link
    return newUrl.split('?')[0] as string
  }

  public async getStreamObject(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })
    const fileDoc = await this.s3Client.send(command)
    return fileDoc
  }

  public async putStreamObject(key: string, data: Buffer, content: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: content,
    })
    await this.s3Client.send(command)
  }

  public async getGeneratedObjectUrl(key: string) {
    return await this.generateGetPresignedUrl({ key })
  }

  public async deleteObject(key: string) {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    try {
      await this.s3Client.send(deleteCommand)
    } catch (error) {
      const errorMsg = error && typeof error === 'object' && 'message' in error ? error.message : JSON.stringify(error)
      throw new Error(`Failed to delete object from S3: ${errorMsg}`)
    }
  }
}