from starlette.requests import Request

from slowapi import Limiter


def _get_real_client_ip(request: Request) -> str:
    """Extract the real client IP from X-Forwarded-For set by the reverse proxy.

    Hugging Face Spaces sits behind a reverse proxy, so
    ``request.client.host`` always shows the proxy's internal IP.
    We trust ``X-Forwarded-For`` here because the container is only
    reachable through HF's own proxy layer.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # The leftmost IP is the original client.
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


limiter = Limiter(
    key_func=_get_real_client_ip,
    default_limits=["200/minute"],
    enabled=True,
)
