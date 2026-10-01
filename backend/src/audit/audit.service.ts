import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    userId: number,
    action: string,
    entityType: string,
    entityId?: string,
    details?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          details,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // We don't throw error to avoid breaking the main business flow
    }
  }
}
