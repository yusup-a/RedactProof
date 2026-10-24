class APIError(Exception):
    """An error whose code and message are safe to return to the client."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
