import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('🚀 Đã kết nối thành công tới Redis Server');
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Lỗi kết nối Redis:', err.message);
    });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  /**
   * Lấy dữ liệu từ cache (Tự động parse JSON)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Lưu dữ liệu vào cache với thời gian sống TTL (giây)
   */
  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } catch (err: any) {
      this.logger.error('Lỗi khi ghi cache Redis: ' + err.message);
    }
  }

  /**
   * Xóa một key cache cụ thể
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.error('Lỗi khi xóa key cache Redis: ' + err.message);
    }
  }

  /**
   * Xóa toàn bộ key cache theo mẫu pattern (ví dụ: 'products:*')
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.log('🧹 Đã xóa ' + keys.length + ' cache keys khớp mẫu ' + pattern);
      }
    } catch (err: any) {
      this.logger.error('Lỗi khi xóa pattern cache Redis: ' + err.message);
    }
  }
}