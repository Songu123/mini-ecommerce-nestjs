import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 16 Pro Max 256GB', description: 'Tên sản phẩm' })
  @IsString({ message: 'Tên sản phẩm phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  name: string;

  @ApiPropertyOptional({ example: 'Chip A18 Pro, màn hình 6.9 inch OLED 120Hz', description: 'Mô tả chi tiết' })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;

  @ApiProperty({ example: 34990000, description: 'Đơn giá sản phẩm' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá sản phẩm phải là số' })
  @IsPositive({ message: 'Giá sản phẩm phải lớn hơn 0' })
  price: number;

  @ApiProperty({ example: 100, description: 'Số lượng hàng tồn kho' })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được nhỏ hơn 0' })
  stock: number;

  @ApiProperty({ example: 1, description: 'ID danh mục mà sản phẩm trực thuộc' })
  @Type(() => Number)
  @IsInt({ message: 'ID danh mục phải là số nguyên' })
  @IsPositive({ message: 'ID danh mục phải hợp lệ' })
  categoryId: number;
}
