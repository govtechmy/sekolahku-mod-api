import type { Categories } from '@types'
import { CategoriesModel } from 'src/models/categories.model'

type CategoriesCache = {
  categories: Categories[]
}

const categoriesCache: CategoriesCache = {
  categories: [],
}

export async function getArticleCachedCategories(): Promise<Categories[]> {
  if (categoriesCache.categories.length === 0) {
    return await loadArticleCategoriesFromDB()
  }
  return categoriesCache.categories
}

export async function loadArticleCategoriesFromDB(): Promise<Categories[]> {
  const categories: Categories[] = await CategoriesModel.find().lean()
  categoriesCache.categories = categories

  return categories
}
