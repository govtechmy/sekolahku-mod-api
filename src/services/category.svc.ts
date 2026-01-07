import type { Category } from '@types'
import { CategoryModel } from 'src/models/category.model'

export class CategoryService {
  public async listCategory(ids: string[]) {
    const result = await CategoryModel.find({ _id: { $in: ids } }).lean()
    return result as unknown as Category[]
  }

  public async searchCategory(name: string) {
    if (name.length > 3) {
      const result = await CategoryModel.find({ value: { $regex: name, $options: 'i' } }).lean()
      return result as unknown as Category[]
    }

    return []
  }
}
