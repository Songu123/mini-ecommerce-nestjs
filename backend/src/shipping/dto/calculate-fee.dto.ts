import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsOptional, Min } from 'class-validator';

export class CalculateFeeDto {
  @ApiProperty({ description: 'ID Quận/Huyện giao đến (Của GHN)' })
  @IsInt()
  to_district_id: number;

  @ApiProperty({ description: 'Mã Phường/Xã giao đến (Của GHN)' })
  @IsString()
  @IsNotEmpty()
  to_ward_code: string;

  @ApiProperty({ description: 'Tổng khối lượng đơn hàng (gram)' })
  @IsInt()
  @Min(1)
  weight: number;

  @ApiProperty({ description: 'Tổng giá trị đơn hàng (VNĐ) để tính bảo hiểm', required: false })
  @IsOptional()
  @IsInt()
  insurance_value?: number;
}
