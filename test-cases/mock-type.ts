import { mock } from 'bun:test'

export type MockQueryType = {
  lean: ReturnType<typeof mock>
  skip: ReturnType<typeof mock>
  limit: ReturnType<typeof mock>
  sort: ReturnType<typeof mock>
}

export type MockQueryOneType = {
  lean: ReturnType<typeof mock>
}

export type MockedModelType = {
  find: ReturnType<typeof mock>
  findOne: ReturnType<typeof mock>
  create: ReturnType<typeof mock>
  countDocuments: ReturnType<typeof mock>
  distinct: ReturnType<typeof mock>
  aggregate: ReturnType<typeof mock>
}

export const mockQuery: MockQueryType = {
  lean: mock(() => Promise.resolve([])),
  skip: mock(() => mockQuery),
  limit: mock(() => mockQuery),
  sort: mock(() => mockQuery),
}

export const mockQueryOne: MockQueryOneType = {
  lean: mock(() => Promise.resolve(null)),
}

export const mockedModel: MockedModelType = {
  find: mock(() => mockQuery),
  findOne: mock(() => mockQueryOne),
  create: mock(() => Promise.resolve({})),
  countDocuments: mock(() => Promise.resolve(1)),
  distinct: mock(() => ({
    lean: mock(() => Promise.resolve([])),
  })),
  aggregate: mock(() => Promise.resolve([])),
}

export const mockedDataProcSvc = {
  revalidateSchoolEntitiesService: mock(() => Promise.resolve()),
}
