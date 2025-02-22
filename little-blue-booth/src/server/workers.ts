import { worker, scheduler } from './api/reasoning_bots/bull_mq_process';

// Graceful shutdown handler
async function shutdown() {
  console.log('Shutting down workers...');
  
  try {
    await Promise.all([
      worker.close(),
      scheduler.close()
    ]);
    console.log('Workers shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Log any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown().catch(console.error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Workers started successfully'); 