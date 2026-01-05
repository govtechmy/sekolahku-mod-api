import type { Categories } from '@types'
import { CategoriesModel } from 'src/models/categories.model'

type CategoriesCache = {
  categories: Categories[]
}

const categoriesCache: CategoriesCache = {
  categories: [],
}

export function getCachedCategories(): Categories[] {
  return categoriesCache.categories
}

export async function loadCategoriesFromDB(): Promise<Categories[]> {
  const categories: Categories[] = await CategoriesModel.find().lean()
  categoriesCache.categories = categories

  return categories
}
