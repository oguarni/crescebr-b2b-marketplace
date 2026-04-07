Stop all Docker services.

## Steps

1. **Show running containers**: Run `docker compose ps` to list what is currently running.
2. **Stop services**: Execute `docker compose down`.
3. **Verify**: Run `docker compose ps` to confirm all containers have stopped.
4. **Report**: Confirm which services were stopped.

## Options

- `docker compose down -v` — also removes named volumes (destroys database data)
- `docker compose down --rmi local` — also removes locally-built images

## Notes

- This stops containers but does NOT delete volumes by default (data is preserved)
- To also remove the database volume and start fresh, use `docker compose down -v`
- Always confirm with the user before using `-v` as it destroys all database data
