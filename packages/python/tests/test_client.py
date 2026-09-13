import httpx
import pytest

from antops import AntOpsClient, AuthenticationError, RateLimitError


def responder(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/v1/tenders":
        assert request.url.params.get_list("keywords") == ["cloud", "security"]
        assert request.headers["x-antops-client"] == "python/0.1.0"
        return httpx.Response(200, json={"items": [], "page": 1, "page_size": 25, "total": 0})
    if request.url.path == "/v1/workspace":
        return httpx.Response(401, json={"detail": "Missing API key"})
    return httpx.Response(429, json={"detail": "Too many requests"})


def test_search_uses_api_contract_and_client_identifier():
    client = AntOpsClient("test-key", base_url="https://api.example", transport=httpx.MockTransport(responder))
    assert client.tenders.search(keywords=["cloud", "security"])["total"] == 0


def test_auth_and_rate_errors_are_useful_and_secret_free():
    client = AntOpsClient("test-key", base_url="https://api.example", transport=httpx.MockTransport(responder))
    with pytest.raises(AuthenticationError, match="Missing API key"):
        client.get("/v1/workspace")
    with pytest.raises(RateLimitError, match="Too many requests"):
        client.get("/v1/usage")
