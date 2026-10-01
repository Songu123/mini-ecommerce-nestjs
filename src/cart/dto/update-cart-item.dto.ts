import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsOptional } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'Số lượng mới (Nếu bằng 0 sẽ tự động xóa khỏi giỏ)' })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(0, { message: 'Số lượng không được âm' })
  quantity: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productVariantId?: number;
}