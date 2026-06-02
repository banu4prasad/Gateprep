# Security
- **Auth**: OTP based, no long-lived passwords except potentially for OAuth. Uses JWT for session tokens.
- **Single Session**: Supported via `current_session_id` in the `users` table.
- **Vulnerabilities**:
  - `docker-compose.yml` has hardcoded postgres passwords:
    `POSTGRES_PASSWORD: gate_pass`

**Evidence (`docker-compose.yml`)**:
```yaml
      POSTGRES_USER: gate
      POSTGRES_PASSWORD: gate_pass
      POSTGRES_DB: gate_prep
```
