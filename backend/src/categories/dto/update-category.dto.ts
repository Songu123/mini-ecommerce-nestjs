import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Điện thoại & Phụ kiện công nghệ', description: 'Tên danh mục sản phẩm' })
  @IsOptional()
  @IsString({ message: 'Tên danh mục phải là chuỗi' })
  name?: string;

  @ApiPropertyOptional({ example: 'Mô tả cập nhật...', description: 'Mô tả danh mục' })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  description?: string;
}
