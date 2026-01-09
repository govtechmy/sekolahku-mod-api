import type { CategoriesDocument } from '@types'
import { CategoriesModel } from 'src/models/categories.model'

type CategoriesCache = {
  categories: CategoriesDocument[]
}

const categoriesCache: CategoriesCache = {
  categories: [],
}

export async function getArticleCachedCategories(): Promise<CategoriesDocument[]> {
  if (categoriesCache.categories.length === 0) {
    return await loadArticleCategoriesFromDB()
  }
  return categoriesCache.categories
}

export async function loadArticleCategoriesFromDB(): Promise<CategoriesDocument[]> {
  const categories = (await CategoriesModel.find().lean()) as CategoriesDocument[]
  categoriesCache.categories = categories

  return categories
}
