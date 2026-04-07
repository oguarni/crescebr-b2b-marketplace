Start all Docker services (PostgreSQL, Redis, backend, frontend).

## Steps

1. **Check Docker is running**: Run `docker info 2>&1 | head -3`. If Docker is not running, prompt the user to start it.
2. **Check for existing containers**: Run `docker compose ps` to show current state.
3. **Start services**: Execute `docker compose up -d`.
4. **Wait and verify**: Run `docker compose ps` to confirm all services are healthy.
5. **Show logs for any unhealthy service**: If a service failed to start, run `docker compose logs <service-name> --tail=20`.
6. **Report**: Show the final state of all services and their mapped ports.

## Services

| Service    | Container Port | Host Port | Notes               |
| ---------- | -------------- | --------- | ------------------- |
| postgres   | 5432           | 5432      | PostgreSQL 15       |
| backend    | 3001           | 3001      | Node.js API         |
| frontend   | 80             | 8080      | Nginx (prod build)  |

## Notes

- Use `docker compose up -d --build` to rebuild images before starting
- Backend runs migrations on startup (`npm run dev` script)
- Frontend serves the production build via Nginx on port 8080
