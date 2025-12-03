import type { ResponseModel } from '../types/entities'
import { RESPONSE_STATUS } from '../types/enum'

/**
 * Creates a successful response object
 * @param data - The data to include in the response
 * @param statusCode - HTTP status code (default: 200)
 * @returns ResponseModel object
 */
export function createSuccessResponse(data: unknown, statusCode: number = 200): ResponseModel {
  return {
    status: RESPONSE_STATUS.SUCCESS,
    statusCode,
    data,
  }
}

/**
 * Creates an error response object
 * @param message - Error message
 * @param code - Error code (default: 'ERR_500')
 * @param statusCode - HTTP status code (default: 500)
 * @returns ResponseModel object
 */
export function createErrorResponse(
  message: string,
  code: string = 'ERR_500',
  statusCode: number = 500,
  errorObject: Record<string, unknown> = {},
): ResponseModel {
  return {
    status: RESPONSE_STATUS.ERROR,
    statusCode,
    data: null,
    error: {
      code,
      message,
      details: { ...errorObject },
    },
  }
}
