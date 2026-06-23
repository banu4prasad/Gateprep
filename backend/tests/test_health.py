"""Health-check tests – verify the FastAPI app boots and core endpoints respond."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    """Reusable TestClient scoped to this module."""
    with TestClient(app) as c:
        yield c


# ── Endpoint checks ──────────────────────────────────────────────────────────


def test_root_returns_ok(client):
    """GET / should return status=ok and advertise the health path."""
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "GATE Prep API"
    assert body["health"] == "/health"


def test_health_returns_ok_with_version(client):
    """GET /health should return status=ok and the current version."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body == {"status": "ok", "version": "2.0.0"}


# ── App configuration checks ─────────────────────────────────────────────────


def test_app_title():
    """The FastAPI app title must be 'GATE Prep Platform'."""
    assert app.title == "GATE Prep Platform"


EXPECTED_ROUTER_PREFIXES = {"/auth", "/admin", "/tests", "/bookmarks", "/series"}


def _collect_prefixes(routes, prefix=""):
    """Recursively walk the route tree and collect first-segment prefixes."""
    prefixes = set()
    for route in routes:
        path = prefix + getattr(route, "path", "")
        parts = path.strip("/").split("/")
        if parts and parts[0]:
            prefixes.add(f"/{parts[0]}")
        # Recurse into sub-routers / mounts
        sub_routes = getattr(route, "routes", None)
        if sub_routes:
            prefixes.update(_collect_prefixes(sub_routes, path))
    return prefixes


def test_all_routers_mounted():
    """All five core routers (auth, admin, tests, bookmarks, series) must be mounted."""
    mounted_prefixes = _collect_prefixes(app.routes)
    missing = EXPECTED_ROUTER_PREFIXES - mounted_prefixes
    assert not missing, f"Missing routers: {missing}"
