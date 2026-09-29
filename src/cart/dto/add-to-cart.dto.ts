import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ example: 1, description: 'ID sản phẩm muốn thêm vào giỏ hàng' })
  @Type(() => Number)
  @IsInt({ message: 'ID sản phẩm phải là số nguyên' })
  @IsPositive({ message: 'ID sản phẩm không hợp lệ' })
  productId: number;

  @ApiProperty({ example: 1, description: 'Số lượng mua (mặc định 1)' })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @IsPositive({ message: 'Số lượng phải lớn hơn 0' })
  quantity: number = 1;
}