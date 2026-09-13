# AntOps Python SDK

```python
from antops import AntOpsClient

client = AntOpsClient.from_environment()
profile = client.company.lookup("GB", "00000006")
assessment = client.change_risk.analyze([
    {"path": "compose.yaml", "content": "services:\\n  app:\\n    privileged: true"}
])
```

The client defaults to `https://api.antops.dev`, uses `ANTOPS_API_KEY`, and has a 15-second timeout.
Set `ANTOPS_BASE_URL` only for a compatible environment.
