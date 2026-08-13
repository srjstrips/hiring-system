import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

export interface ObjectStorage {
  putObject(key: string, data: Buffer | NodeJS.ReadableStream, contentType?: string): Promise<void>;
  getObjectStream(key: string): Promise<NodeJS.ReadableStream>;
  getObjectBuffer(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUploadUrl?(key: string, contentType: string, expiresInSeconds: number): Promise<string | null>;
  getSignedDownloadUrl?(key: string, expiresInSeconds: number): Promise<string | null>;
}

class LocalObjectStorage implements ObjectStorage {
  private root: string;

  constructor() {
    this.root = path.resolve(env.UPLOAD_DIR, 'assessment-recordings-private');
    if (!fsSync.existsSync(this.root)) {
      fsSync.mkdirSync(this.root, { recursive: true });
    }
  }

  private resolveKey(key: string) {
    const normalized = key.replace(/^\/+/, '').replace(/\.\./g, '');
    const full = path.resolve(this.root, normalized);
    if (!full.startsWith(this.root)) throw new Error('Invalid storage key');
    return full;
  }

  async putObject(key: string, data: Buffer | NodeJS.ReadableStream) {
    const full = this.resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    if (Buffer.isBuffer(data)) {
      await fs.writeFile(full, data);
      return;
    }
    await pipeline(data as NodeJS.ReadableStream, createWriteStream(full));
  }

  async getObjectStream(key: string) {
    return createReadStream(this.resolveKey(key));
  }

  async getObjectBuffer(key: string) {
    return fs.readFile(this.resolveKey(key));
  }

  async deleteObject(key: string) {
    try {
      await fs.unlink(this.resolveKey(key));
    } catch (e: any) {
      if (e?.code !== 'ENOENT') throw e;
    }
  }

  async deletePrefix(prefix: string) {
    try {
      await fs.rm(this.resolveKey(prefix), { recursive: true, force: true });
    } catch (e: any) {
      if (e?.code !== 'ENOENT') throw e;
    }
  }

  async exists(key: string) {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUploadUrl() {
    return null;
  }

  async getSignedDownloadUrl() {
    return null;
  }
}

class S3ObjectStorage implements ObjectStorage {
  private client: any;
  private bucket: string;
  private PutObjectCommand: any;
  private GetObjectCommand: any;
  private DeleteObjectCommand: any;
  private ListObjectsV2Command: any;
  private getSignedUrl: any;

  constructor() {
    // Optional dependency — only required when STORAGE_PROVIDER=s3
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const s3 = require('@aws-sdk/client-s3');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    this.PutObjectCommand = s3.PutObjectCommand;
    this.GetObjectCommand = s3.GetObjectCommand;
    this.DeleteObjectCommand = s3.DeleteObjectCommand;
    this.ListObjectsV2Command = s3.ListObjectsV2Command;
    this.getSignedUrl = getSignedUrl;
    this.bucket = env.STORAGE_BUCKET;
    this.client = new s3.S3Client({
      region: env.STORAGE_REGION || 'us-east-1',
      endpoint: env.STORAGE_ENDPOINT || undefined,
      forcePathStyle: Boolean(env.STORAGE_FORCE_PATH_STYLE),
      credentials:
        env.STORAGE_ACCESS_KEY && env.STORAGE_SECRET_KEY
          ? { accessKeyId: env.STORAGE_ACCESS_KEY, secretAccessKey: env.STORAGE_SECRET_KEY }
          : undefined,
    });
  }

  async putObject(key: string, data: Buffer | NodeJS.ReadableStream, contentType?: string) {
    const Body = Buffer.isBuffer(data) ? data : await streamToBuffer(data);
    await this.client.send(
      new this.PutObjectCommand({ Bucket: this.bucket, Key: key, Body, ContentType: contentType })
    );
  }

  async getObjectStream(key: string) {
    const res = await this.client.send(new this.GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as NodeJS.ReadableStream;
  }

  async getObjectBuffer(key: string) {
    return streamToBuffer(await this.getObjectStream(key));
  }

  async deleteObject(key: string) {
    await this.client.send(new this.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deletePrefix(prefix: string) {
    let token: string | undefined;
    do {
      const listed = await this.client.send(
        new this.ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token })
      );
      for (const obj of listed.Contents || []) {
        if (obj.Key) await this.deleteObject(obj.Key);
      }
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
  }

  async exists(key: string) {
    try {
      await this.client.send(new this.GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUploadUrl(key: string, contentType: string, expiresInSeconds: number) {
    return this.getSignedUrl(
      this.client,
      new this.PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds }
    );
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds: number) {
    return this.getSignedUrl(
      this.client,
      new this.GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    );
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function createStorage(): ObjectStorage {
  if (env.STORAGE_PROVIDER === 's3') {
    if (!env.STORAGE_BUCKET) {
      logger.warn('STORAGE_PROVIDER=s3 but STORAGE_BUCKET empty; using local storage');
      return new LocalObjectStorage();
    }
    try {
      return new S3ObjectStorage();
    } catch (err) {
      logger.error('S3 storage init failed; falling back to local', err);
      return new LocalObjectStorage();
    }
  }
  return new LocalObjectStorage();
}

export const objectStorage = createStorage();

export function buildRecordingPrefix(params: {
  assessmentId: string;
  assignmentId: string;
  attemptId: string;
  recordingType: 'CAMERA' | 'SCREEN';
}) {
  const folder = params.recordingType === 'CAMERA' ? 'candidate' : 'screen';
  return `assessment-recordings/${params.assessmentId}/${params.assignmentId}/${params.attemptId}/${folder}`;
}
