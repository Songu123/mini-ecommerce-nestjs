import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'super-access-secret';
    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'super-refresh-secret';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const [accessToken, rawRefreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    // Băm refresh token trước khi lưu vào database
    const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Lưu vào bảng RefreshToken riêng biệt
    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      message: 'Đăng ký tài khoản thành công',
      user,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ CSKH.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Đăng nhập thành công',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'super-refresh-secret';

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { refreshTokens: true },
    });

    if (!user || !user.refreshTokens || user.refreshTokens.length === 0) {
      throw new UnauthorizedException('Phiên đăng nhập không tồn tại');
    }

    // Tìm và so sánh token với các bản ghi trong DB
    let matchedTokenRecord: any = null;
    for (const record of user.refreshTokens) {
      const isMatch = await bcrypt.compare(refreshToken, record.token);
      if (isMatch) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi');
    }

    // Xóa refresh token cũ (Token Rotation)
    await this.prisma.refreshToken.delete({
      where: { id: matchedTokenRecord.id },
    });

    // Cấp cặp token mới
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Làm mới token thành công',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async logout(userId: number, refreshToken?: string) {
    if (refreshToken) {
      // Đăng xuất khỏi thiết bị cụ thể
      const records = await this.prisma.refreshToken.findMany({
        where: { userId },
      });
      for (const record of records) {
        const isMatch = await bcrypt.compare(refreshToken, record.token);
        if (isMatch) {
          await this.prisma.refreshToken.delete({ where: { id: record.id } });
          break;
        }
      }
    } else {
      // Nếu không gửi token cụ thể, xoá token gần nhất
      const latest = await this.prisma.refreshToken.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (latest) {
        await this.prisma.refreshToken.delete({ where: { id: latest.id } });
      }
    }

    return { message: 'Đăng xuất thành công' };
  }

  async logoutAll(userId: number) {
    // Đăng xuất khỏi tất cả thiết bị
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    return { message: 'Đã đăng xuất khỏi tất cả các thiết bị' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    return user;
  }
}

