/** Error codes from the contract, plus NETWORK_ERROR for when the API cannot be reached. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }

  get isSessionExpired() {
    return this.code === 'SESSION_EXPIRED_OR_NOT_FOUND'
  }
}
