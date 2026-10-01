import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { QueryReviewDto } from './dto/query-review.dto.js';

@ApiTags('Reviews & Ratings (Đánh Giá Sản Phẩm)')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đánh giá sản phẩm (Chỉ áp dụng với Verified Purchase: đơn hàng đã giao DELIVERED)',
  })
  @ApiResponse({ status: 201, description: 'Gửi đánh giá thành công' })
  @ApiResponse({ status: 400, description: 'Chưa từng mua sản phẩm hoặc đơn hàng chưa giao thành công' })
  async createReview(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    const userId = user.id ?? user.userId;
    return this.reviewsService.upsertReview(userId, dto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Lấy danh sách review, điểm trung bình và phân bố sao của sản phẩm' })
  @ApiResponse({ status: 200, description: 'Danh sách đánh giá và thống kê' })
  async getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() query: QueryReviewDto,
  ) {
    return this.reviewsService.getProductReviews(productId, query);
  }

  @Delete('product/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa đánh giá của chính mình đối với sản phẩm' })
  @ApiResponse({ status: 200, description: 'Xóa đánh giá thành công' })
  async deleteReview(
    @CurrentUser() user: any,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const userId = user.id ?? user.userId;
    return this.reviewsService.deleteReview(userId, productId);
  }
}
