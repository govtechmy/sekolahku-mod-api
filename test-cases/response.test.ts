import { describe, expect, test } from 'bun:test'

import { RESPONSE_STATUS } from '../src/types/enum'
import { createErrorResponse, createSuccessResponse } from '../src/utils/response.util'

describe('response utils', () => {
  test('createSuccessResponse with default status code', () => {
    const result = createSuccessResponse('test data')
    expect(result).toEqual({
      status: RESPONSE_STATUS.SUCCESS,
      statusCode: 200,
      data: 'test data',
    })
  })

  test('createSuccessResponse with custom status code', () => {
    const result = createSuccessResponse('test data', 201)
    expect(result).toEqual({
      status: RESPONSE_STATUS.SUCCESS,
      statusCode: 201,
      data: 'test data',
    })
  })

  test('createErrorResponse with defaults', () => {
    const result = createErrorResponse('Something went wrong')
    expect(result).toEqual({
      status: RESPONSE_STATUS.ERROR,
      statusCode: 500,
      data: null,
      error: {
        code: 'ERR_500',
        message: 'Something went wrong',
        details: {},
      },
    })
  })

  test('createErrorResponse with custom params', () => {
    const result = createErrorResponse('Not found', 'ERR_404', 404, { field: 'id' })
    expect(result).toEqual({
      status: RESPONSE_STATUS.ERROR,
      statusCode: 404,
      data: null,
      error: {
        code: 'ERR_404',
        message: 'Not found',
        details: { field: 'id' },
      },
    })
  })
})
