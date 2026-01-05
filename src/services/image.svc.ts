import type { ArticleMedia } from '@types'
import { env } from 'src/config/env.config'

import { ArticleMediaModel } from '../models/article-media.model'

export class ImageService {
  public async listImages(ids: string[]): Promise<(ArticleMedia & { _id: string; url: string })[]> {
    const images = await ArticleMediaModel.find({ _id: { $in: ids } }).lean()
    images.forEach(image => {
      const url = `${env.CMS_URL}/${env.CMS_IMAGES_PATH}/${encodeURIComponent(image.filename)}`
      Object.assign(image, { url, _id: image._id.toString() })
    })
    return images as unknown as (ArticleMedia & { _id: string; url: string })[]
  }
}
