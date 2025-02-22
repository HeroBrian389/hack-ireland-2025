// ./src/server/utils/s3.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env";

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Utility for uploading a file to S3.
 * @param bucket   Name of your S3 bucket
 * @param key      The S3 object key
 * @param body     The file contents as Buffer
 * @param mimeType The content type (e.g. 'image/png')
 */
export async function uploadToS3(bucket: string, key: string, body: Buffer, mimeType: string) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    }),
  );
  return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
