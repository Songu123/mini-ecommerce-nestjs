import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 1, description: 'ID của sản phẩm muốn đánh giá' })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ example: 5, description: 'Số sao đánh giá (1 đến 5 sao)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @ApiPropertyOptional({ example: 'Sản phẩm dùng rất tốt, đóng gói kỹ càng!', description: 'Nội dung nhận xét' })
  @IsString()
  @IsOptional()
  comment?: string;
}
