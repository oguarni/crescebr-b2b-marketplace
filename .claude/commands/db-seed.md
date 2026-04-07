Seed the database with test/development data.

## Steps

1. **Confirm migrations are up**: Run `cd backend && npx sequelize-cli db:migrate:status` and verify all are `up`. If not, run `/db-migrate` first.
2. **Seed all**: Execute `cd backend && npx sequelize-cli db:seed:all`.
3. **Verify**: Check that seed accounts exist by running `cd backend && npx sequelize-cli db:migrate:status` or confirming the output shows seeders applied.
4. **Report**: List which seeders ran and the test accounts created.

## Test Accounts Created

| Role     | Email                   | Password     |
| -------- | ----------------------- | ------------ |
| Admin    | admin@crescebr.com      | admin123     |
| Supplier | supplier@example.com    | supplier123  |
| Buyer    | buyer@example.com       | buyer123     |

## Undo

To remove all seed data: `cd backend && npx sequelize-cli db:seed:undo:all`

## Notes

- Seed data is for development only — never run against production
- Re-seeding on an already-seeded DB may produce duplicates unless `undo:all` is run first
