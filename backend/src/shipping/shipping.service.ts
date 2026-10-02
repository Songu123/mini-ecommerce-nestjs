import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalculateFeeDto } from './dto/calculate-fee.dto.js';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly apiUrl = 'https://online-gateway.ghn.vn/shiip/public-api';
  private readonly ghnToken: string;
  private readonly ghnShopId: string;

  constructor(private configService: ConfigService) {
    this.ghnToken = this.configService.get<string>('GHN_API_TOKEN') || 'dummy-token';
    this.ghnShopId = this.configService.get<string>('GHN_SHOP_ID') || 'dummy-shop-id';
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'Token': this.ghnToken,
      'ShopId': this.ghnShopId,
    };
  }

  async getProvinces() {
    try {
      const res = await fetch(`${this.apiUrl}/master-data/province`, { headers: this.headers });
      const data = await res.json();
      return data.data;
    } catch (error) {
      this.logger.error('Error fetching provinces from GHN', error);
      throw new HttpException('Không thể lấy danh sách Tỉnh/Thành', HttpStatus.BAD_GATEWAY);
    }
  }

  async getDistricts(provinceId: number) {
    try {
      const res = await fetch(`${this.apiUrl}/master-data/district?province_id=${provinceId}`, { headers: this.headers });
      const data = await res.json();
      return data.data;
    } catch (error) {
      this.logger.error('Error fetching districts from GHN', error);
      throw new HttpException('Không thể lấy danh sách Quận/Huyện', HttpStatus.BAD_GATEWAY);
    }
  }

  async getWards(districtId: number) {
    try {
      const res = await fetch(`${this.apiUrl}/master-data/ward?district_id=${districtId}`, { headers: this.headers });
      const data = await res.json();
      return data.data;
    } catch (error) {
      this.logger.error('Error fetching wards from GHN', error);
      throw new HttpException('Không thể lấy danh sách Phường/Xã', HttpStatus.BAD_GATEWAY);
    }
  }

  async calculateFee(dto: CalculateFeeDto) {
    try {
      // Dữ liệu shop gửi đi (Mặc định lấy ShopId từ Env, nên không cần from_district_id nếu ShopId đã định cấu hình kho trên GHN)
      // Nhưng để an toàn cho API /v2/shipping-order/fee, ta cần from_district_id.
      // Vì là Mocking/MVP, chúng ta set cứng from_district_id là 1454 (Quận 3, TP.HCM)
      
      const payload = {
        service_type_id: 2, // 2 = Giao Hàng Chuẩn
        from_district_id: 1454,
        to_district_id: dto.to_district_id,
        to_ward_code: dto.to_ward_code,
        weight: dto.weight,
        insurance_value: dto.insurance_value || 0,
      };

      const res = await fetch(`${this.apiUrl}/v2/shipping-order/fee`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.code !== 200) {
        throw new Error(data.message);
      }
      return data.data;
    } catch (error: any) {
      this.logger.error('Error calculating shipping fee from GHN', error);
      throw new HttpException(error.message || 'Lỗi tính phí giao hàng', HttpStatus.BAD_GATEWAY);
    }
  }
}
