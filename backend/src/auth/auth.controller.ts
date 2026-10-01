import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 409, description: 'Email đã được sử dụng' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Giới hạn nghiêm ngặt: Tối đa 5 lần thử đăng nhập trong 1 phút để chống Brute-force
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập (Giới hạn tối đa 5 lần/phút chống Brute-force)' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không chính xác' })
  @ApiResponse({ status: 429, description: 'Quá nhiều yêu cầu thử đăng nhập (Throttled)' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cấp Access Token mới bằng Refresh Token' })
  @ApiResponse({ status: 200, description: 'Cấp token mới thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất khỏi thiết bị hiện tại' })
  logout(@CurrentUser() user: any, @Body() body?: RefreshTokenDto) {
    return this.authService.logout(user.id, body?.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất khỏi tất cả các thiết bị' })
  logoutAll(@CurrentUser() user: any) {
    return this.authService.logoutAll(user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại (Yêu cầu JWT Token)' })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực hoặc Token hết hạn' })
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Chuyển hướng đến màn hình đăng nhập Google' })
  async googleAuth(@Req() req: any) {
    // AuthGuard sẽ tự động chuyển hướng
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Xử lý callback từ Google trả về' })
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    const tokens = await this.authService.googleLogin(req.user);
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/login?token=${tokens.accessToken}`);
  }
}
