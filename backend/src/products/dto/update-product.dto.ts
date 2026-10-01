import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'iPhone 16 Pro Max 512GB', description: 'Tên sản phẩm' })
  @IsOptional()
  @IsString({ message: 'Tên sản phẩm phải là chuỗi' })
  name?: string;

  @ApiPropertyOptional({ example: 'Mô tả cập nhật...', description: 'Mô tả chi tiết' })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;

  @ApiPropertyOptional({ example: 38990000, description: 'Đơn giá sản phẩm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá sản phẩm phải là số' })
  @IsPositive({ message: 'Giá sản phẩm phải lớn hơn 0' })
  price?: number;

  @ApiPropertyOptional({ example: 50, description: 'Số lượng hàng tồn kho' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được nhỏ hơn 0' })
  stock?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID danh mục phải là số nguyên' })
  @IsPositive({ message: 'ID danh mục phải hợp lệ' })
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Danh sách phân loại sản phẩm (tùy chọn)' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

export class ProductVariantDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsNumber()
  price?: number;
}
