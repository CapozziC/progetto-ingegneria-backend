import express from 'express';
import { AppDataSource } from './db/data-source.js';

try {
  await AppDataSource.initialize();
  const app = express();
  const port = 3000;

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  // Check backend connection
  app.listen(port, 'localhost', () => {
    console.log(`Example app listening on port ${port}`);
  });
} catch (error) {
  console.log(error);
}