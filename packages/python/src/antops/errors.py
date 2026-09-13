from __future__ import annotations


class AntOpsError(RuntimeError):
    """A non-secret error returned while communicating with AntOps."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class AuthenticationError(AntOpsError):
    pass


class RateLimitError(AntOpsError):
    pass


class PolicyBlockedError(AntOpsError):
    pass
