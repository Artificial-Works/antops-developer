from __future__ import annotations

import os
from collections.abc import Iterator, Mapping, Sequence
from pathlib import Path
from typing import Any

import httpx

from antops.errors import AntOpsError, AuthenticationError, RateLimitError

DEFAULT_BASE_URL = "https://api.antops.dev"
MAX_RESPONSE_BYTES = 2_000_000


class _CompanyClient:
    def __init__(self, client: AntOpsClient) -> None:
        self._client = client

    def lookup(self, jurisdiction: str, registration_number: str, *, provider: str | None = None) -> dict[str, Any]:
        return self._client.get(f"/v1/companies/{jurisdiction}/{registration_number}", provider=provider)

    def watch(self, jurisdiction: str, registration_number: str, *, interval_seconds: int = 86_400) -> dict[str, Any]:
        return self._client.post("/v1/companies", {"jurisdiction": jurisdiction, "registration_number": registration_number, "monitor_interval_seconds": interval_seconds})


class _DomainClient:
    def __init__(self, client: AntOpsClient) -> None:
        self._client = client

    def check(self, domain: str) -> dict[str, Any]:
        return self._client.post("/v1/domain/check", {"domain": domain})

    def monitor(self, domain: str, *, customer_label: str | None = None, interval_seconds: int = 3600) -> dict[str, Any]:
        payload: dict[str, Any] = {"domain": domain, "policy": {"interval_seconds": interval_seconds}}
        if customer_label:
            payload["customer_label"] = customer_label
        return self._client.post("/v1/domain-assets", payload)

    def status(self, asset_id: str) -> dict[str, Any]:
        return self._client.get(f"/v1/domain-assets/{asset_id}/status")


class _TenderClient:
    def __init__(self, client: AntOpsClient) -> None:
        self._client = client

    def search(self, *, keywords: Sequence[str] = (), page: int = 1, page_size: int = 25, **filters: Any) -> dict[str, Any]:
        params: list[tuple[str, str]] = [("page", str(page)), ("page_size", str(page_size))]
        params.extend(("keywords", item) for item in keywords)
        params.extend((key, str(value)) for key, value in filters.items() if value is not None)
        return self._client.get("/v1/tenders", params=params)

    def matches(self, saved_search_id: str) -> list[dict[str, Any]]:
        return self._client.get(f"/v1/tender-saved-searches/{saved_search_id}/matches")

    def iter_search(self, **kwargs: Any) -> Iterator[dict[str, Any]]:
        page = 1
        while True:
            result = self.search(page=page, **kwargs)
            yield from result["items"]
            if page * result["page_size"] >= result["total"]:
                return
            page += 1


class _ChangeRiskClient:
    def __init__(self, client: AntOpsClient) -> None:
        self._client = client

    def analyze(self, files: Sequence[Mapping[str, str]], *, revision: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"files": list(files)}
        if revision:
            payload["revision"] = revision
        return self._client.post("/v1/change-risk/analyses", payload)


class _DocumentClient:
    def __init__(self, client: AntOpsClient) -> None:
        self._client = client

    def upload(self, path: str | Path) -> dict[str, Any]:
        source = Path(path)
        with source.open("rb") as handle:
            return self._client.post_multipart("/v1/documents", {"document": (source.name, handle)})


class AntOpsClient:
    def __init__(self, api_key: str, *, base_url: str = DEFAULT_BASE_URL, timeout: float = 15.0, client_id: str = "python/0.1.0", transport: httpx.BaseTransport | None = None) -> None:
        if not api_key.strip():
            raise ValueError("An AntOps API key is required.")
        self._api_key = api_key
        self._client = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout, transport=transport, headers={"X-API-Key": api_key, "User-Agent": f"antops-{client_id}", "X-AntOps-Client": client_id})
        self.company = _CompanyClient(self)
        self.domains = _DomainClient(self)
        self.tenders = _TenderClient(self)
        self.change_risk = _ChangeRiskClient(self)
        self.documents = _DocumentClient(self)

    @classmethod
    def from_environment(cls) -> AntOpsClient:
        api_key = os.environ.get("ANTOPS_API_KEY", "")
        return cls(api_key, base_url=os.environ.get("ANTOPS_BASE_URL", DEFAULT_BASE_URL))

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> AntOpsClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def get(self, path: str, **params: Any) -> Any:
        query = params.pop("params", None)
        return self._request("GET", path, params=query or {key: value for key, value in params.items() if value is not None})

    def post(self, path: str, payload: Mapping[str, Any]) -> Any:
        return self._request("POST", path, json=dict(payload))

    def post_multipart(self, path: str, files: Mapping[str, Any]) -> Any:
        return self._request("POST", path, files=files)

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            response = self._client.request(method, path, **kwargs)
        except httpx.TimeoutException as exc:
            raise AntOpsError("AntOps request timed out.") from exc
        except httpx.HTTPError as exc:
            raise AntOpsError("AntOps request could not be completed.") from exc
        if len(response.content) > MAX_RESPONSE_BYTES:
            raise AntOpsError("AntOps response exceeded the client safety limit.", status_code=response.status_code)
        if response.status_code >= 400:
            detail = _safe_detail(response)
            error_type = AuthenticationError if response.status_code in {401, 403} else RateLimitError if response.status_code == 429 else AntOpsError
            raise error_type(detail, status_code=response.status_code)
        try:
            return response.json()
        except ValueError as exc:
            raise AntOpsError("AntOps returned a non-JSON response.", status_code=response.status_code) from exc


def _safe_detail(response: httpx.Response) -> str:
    try:
        value = response.json().get("detail")
        if isinstance(value, str) and value:
            return value[:500]
    except ValueError:
        pass
    return f"AntOps request failed with status {response.status_code}."
