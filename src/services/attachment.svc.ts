import type { Media } from '@types'
import { env } from 'src/config/env.config'
import { MediaModel } from 'src/models/media.model'

export class AttachmentService {
  public async listFiles(ids: string[]): Promise<(Media & { url: string })[]> {
    const images = await MediaModel.find({ _id: { $in: ids } }).lean()
    images.forEach(image => {
      const url = `${env.CMS_URL}/${env.CMS_IMAGES_PATH}/${encodeURIComponent(image.filename)}`
      Object.assign(image, { url, _id: image._id.toString() })
    })
    return images as unknown as (Media & { url: string })[]
  }
}
