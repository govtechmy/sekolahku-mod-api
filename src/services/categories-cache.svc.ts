import type { Categories } from '@types'
import { CategoriesModel } from 'src/models/categories.model'

type CategoriesCache = {
  categories: Categories[]
}

const categoriesCache: CategoriesCache = {
  categories: [],
}

export async function getCachedCategories(): Promise<Categories[]> {
  if (categoriesCache.categories.length === 0) {
    return await loadCategoriesFromDB()
  }
  return categoriesCache.categories
}

export async function loadCategoriesFromDB(): Promise<Categories[]> {
  const categories: Categories[] = await CategoriesModel.find().lean()
  categoriesCache.categories = categories

  return categories
}
