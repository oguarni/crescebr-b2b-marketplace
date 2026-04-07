Run Sequelize database migrations in the backend workspace.

## Steps

1. **Check pending migrations**: Run `cd backend && npx sequelize-cli db:migrate:status` and list which migrations are pending.
2. **Run migrations**: Execute `cd backend && npx sequelize-cli db:migrate`.
3. **Verify**: Run `db:migrate:status` again and confirm all migrations are now `up`.
4. **Report**: Show which migrations were applied and the final migration state.

## Undo

To roll back the last migration: `cd backend && npx sequelize-cli db:migrate:undo`
To roll back all: `cd backend && npx sequelize-cli db:migrate:undo:all`

## Notes

- Requires `DATABASE_URL` or individual `DB_*` env vars to be set
- Run migrations before seeding (`/db-seed`)
- In development, `npm run dev` runs migrations automatically on startup
