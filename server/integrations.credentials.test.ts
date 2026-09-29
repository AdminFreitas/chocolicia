import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

const neonUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
const hasS3 =
  Boolean(process.env.AWS_ENDPOINT_URL_S3) &&
  Boolean(process.env.AWS_ACCESS_KEY_ID) &&
  Boolean(process.env.AWS_SECRET_ACCESS_KEY);

describe("external integration credentials", () => {
  it.skipIf(!neonUrl)("connects to Neon with SELECT 1", async () => {
    const sql = postgres(neonUrl!, { max: 1, prepare: false, connect_timeout: 15 });
    try {
      const result = await sql`SELECT 1 AS ok`;
      expect(result[0]?.ok).toBe(1);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }, 20_000);

  it.skipIf(!hasS3)("authenticates against the S3-compatible assets bucket", async () => {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const client = new S3Client({
      endpoint,
      region: process.env.AWS_REGION ?? "us-east-2",
      forcePathStyle: true,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
    try {
      await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME ?? "assets" }));
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err?.name === "NoSuchBucket" || err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
        expect(err?.$metadata?.httpStatusCode).toBe(404);
        return;
      }
      throw error;
    }
  }, 20_000);
});
