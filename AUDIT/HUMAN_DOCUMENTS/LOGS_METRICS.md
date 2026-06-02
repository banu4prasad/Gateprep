# Logs and Metrics
- **Logs**: Default Uvicorn/FastAPI logging to stdout. No structured logging (JSON) configured.
- **Metrics**: A basic `/health` endpoint exists. No Prometheus or Datadog integrations found.

**Evidence (`backend/app/main.py`)**:
```python
@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
```
