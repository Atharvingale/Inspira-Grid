import initDatabase from '../database/init.js';

// Run database initialization
console.log('Initializing Firebase database...');
initDatabase()
  .then(() => {
    console.log('Firebase database initialization completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Firebase database initialization failed:', err);
    process.exit(1);
  });