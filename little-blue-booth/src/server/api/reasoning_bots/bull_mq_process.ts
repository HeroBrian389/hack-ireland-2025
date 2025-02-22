import { Queue, Worker, Job } from 'bullmq';
import { query_chat_bot } from './analyse_data';

const QUEUE_NAME = 'foo';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const myQueue = new Queue(QUEUE_NAME, { connection });
// myQueue.obliterate()
async function addJobs() {
  await myQueue.add('process_data', { data: 'health record' });
}

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    // Do something with job
    console.log(job.data.data);
    const res = await query_chat_bot();
    await job.updateData({
        ...job.data,
        processed: res
    })
  },
  { connection, concurrency: 50 },
);



export { addJobs, QUEUE_NAME, myQueue };