import os
import socket

# Set before the app is imported: load_dotenv() does not override existing variables,
# so a developer's real backend/.env can never be used by the test suite.
os.environ["AI_MODE"] = "demo"
os.environ["ANTHROPIC_API_KEY"] = "test-dummy-key-not-real"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import claude_service

LOOPBACK = {"127.0.0.1", "::1", "localhost"}


class ExternalNetworkBlocked(RuntimeError):
    pass


@pytest.fixture(autouse=True)
def block_external_network(monkeypatch):
    """Fail on any non-loopback connection (asyncio on Windows needs loopback)."""
    real_connect = socket.socket.connect
    real_connect_ex = socket.socket.connect_ex
    real_getaddrinfo = socket.getaddrinfo

    def check(address):
        host = address[0] if isinstance(address, tuple) else address
        if host not in LOOPBACK:
            raise ExternalNetworkBlocked(f"external connection attempted: {host}")

    def guarded_connect(self, address):
        check(address)
        return real_connect(self, address)

    def guarded_connect_ex(self, address):
        check(address)
        return real_connect_ex(self, address)

    def guarded_getaddrinfo(host, *args, **kwargs):
        check((host,))
        return real_getaddrinfo(host, *args, **kwargs)

    monkeypatch.setattr(socket.socket, "connect", guarded_connect)
    monkeypatch.setattr(socket.socket, "connect_ex", guarded_connect_ex)
    monkeypatch.setattr(socket, "getaddrinfo", guarded_getaddrinfo)


@pytest.fixture(autouse=True)
def reset_client_cache():
    # Keep a reference: tests may replace _build_client until monkeypatch undoes it.
    build_client = claude_service._build_client
    build_client.cache_clear()
    yield
    build_client.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)
