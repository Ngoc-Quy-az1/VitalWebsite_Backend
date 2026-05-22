import { DataSource } from 'typeorm';
import { AppDataSource } from '@/data-source';

export default async (): Promise<DataSource> => {
  try {
    await AppDataSource.initialize();
    console.log('PostgreSQL database connection established');
    return AppDataSource;
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    throw error;
  }
};
