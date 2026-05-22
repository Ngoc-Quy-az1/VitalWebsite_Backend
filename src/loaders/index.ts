import expressLoader from './express';
import dependencyInjectorLoader from './dependencyInjector';
import typeormLoader from './typeorm';
import jobsLoader from './jobs';
import Logger from './logger';
//We have to import at least all the events once so they can be triggered
import './events';

export default async ({ expressApp }) => {
  const appDataSource = await typeormLoader();

  /**
   * We are injecting the TypeORM repositories into the DI container.
   */
  await dependencyInjectorLoader({
    appDataSource,
  });

  await jobsLoader();

  await expressLoader({ app: expressApp });
};
