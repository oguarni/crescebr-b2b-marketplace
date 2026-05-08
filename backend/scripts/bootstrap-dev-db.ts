import models from '../src/models';

async function bootstrap() {
  await models.sequelize.sync({ force: true });
  await models.sequelize.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
