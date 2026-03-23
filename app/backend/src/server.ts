import './config/env';
import app from './app';
import { ensureBlobContainer } from './services/azureBlob.service';
import { testDbConnection } from './config/db';

const PORT = Number(process.env.PORT || 8000);

async function start(): Promise<void> {
  await testDbConnection();
  await ensureBlobContainer();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
