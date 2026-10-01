'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatVND } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, CheckCircle2, ShoppingBag, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getFullImageUrl } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const { items: allItems, getSubtotal, getTotalPrice, appliedCoupon, clearSelectedItems } = useCartStore();
  const items = allItems.filter(item => item.selected);
  const { isAuthenticated, user, token, isLoading } = useAuthStore();
  const { success, error } = useToast();

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<number | null>(null);

  const validatePhone = (p: string) => {
    if (!p) return 'Vui lòng nhập số điện thoại';
    if (p.length < 10) return 'Số điện thoại quá ngắn (Yêu cầu tối thiểu 10 số)';
    if (p.length > 11) return 'Số điện thoại quá dài';
    if (p.startsWith('0') && p.length !== 10) return 'Số điện thoại di động VN bắt đầu bằng số 0 phải có đúng 10 số';
    if (p.startsWith('84') && p.length !== 11) return 'Số điện thoại bắt đầu bằng mã vùng 84 phải có đúng 11 số';
    
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(p)) return 'Đầu số không hợp lệ (Chỉ hỗ trợ: 03, 05, 07, 08, 09 hoặc 84)';
    return '';
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      error('Vui lòng đăng nhập để tiến hành thanh toán');
      router.push('/login?redirect=/checkout');
    }
  }, [isLoading, isAuthenticated, router, error]);

  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect to cart if empty or no items selected
  useEffect(() => {
    if (items.length === 0 && !orderSuccessId && !isRedirecting) {
      router.push('/cart');
    }
  }, [items.length, orderSuccessId, router, isRedirecting]);

  // Fetch provinces on mount
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/?depth=3')
      .then((res) => res.json())
      .then((data) => setProvinces(data))
      .catch((err) => console.error('Failed to fetch provinces', err));
  }, []);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedProvince(code);
    setSelectedDistrict('');
    setSelectedWard('');
    
    const province = provinces.find((p) => p.code == code);
    setDistricts(province?.districts || []);
    setWards([]);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedDistrict(code);
    setSelectedWard('');
    
    const district = districts.find((d) => d.code == code);
    setWards(district?.wards || []);
  };

  if (isLoading || !isAuthenticated) {
    return <div className="py-24 text-center">Đang kiểm tra thông tin...</div>;
  }

  if (orderSuccessId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Đặt hàng thành công!</h1>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          Cảm ơn bạn đã tin tưởng mua sắm tại TechStore. Mã đơn hàng của bạn là <strong className="text-slate-900">#{orderSuccessId}</strong>.
          Chúng tôi sẽ sớm liên hệ để giao hàng.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href={`/orders`}>
            <Button variant="outline" className="w-full sm:w-auto">Quản lý đơn hàng</Button>
          </Link>
          <Link href="/products">
            <Button className="w-full sm:w-auto">Tiếp tục mua sắm</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const pName = provinces.find(x => x.code == selectedProvince)?.name || '';
      const dName = districts.find(x => x.code == selectedDistrict)?.name || '';
      const wName = wards.find(x => x.code == selectedWard)?.name || '';
      const fullAddress = [streetAddress, wName, dName, pName].filter(Boolean).join(', ');

      if (!phone || !fullAddress || !streetAddress || !selectedProvince || !selectedDistrict || !selectedWard) {
        error('Vui lòng điền đầy đủ thông tin giao hàng (Số điện thoại và Địa chỉ chi tiết)');
        setSubmitting(false);
        return;
      }

      const phoneErr = validatePhone(phone);
      if (phoneErr) {
        setPhoneError(phoneErr);
        error(phoneErr);
        setSubmitting(false);
        return;
      }
      setPhoneError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const orderItems = items.map(item => ({
        productId: item.product.id,
        productVariantId: item.variant?.id,
        quantity: item.quantity
      }));

      const payload = {
        items: orderItems,
        shippingAddress: fullAddress,
        phone: phone,
        note: note,
        paymentMethod: paymentMethod,
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {})
      };

      const res = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        success('Đơn hàng đã được tạo thành công!');
        if (paymentMethod === 'ONLINE') {
          setIsRedirecting(true);
          clearSelectedItems();
          // We will fetch payment URL from API or redirect directly to our payment intent endpoint
          // Wait, the backend doesn't automatically create intent. We need to redirect to a page that creates it.
          router.push(`/payment/${data.id}`);
        } else {
          setOrderSuccessId(data.id);
          clearSelectedItems();
        }
      } else {
        const errMsg = Array.isArray(data.message) ? data.message[0] : (data.message || 'Có lỗi xảy ra khi đặt hàng');
        error(errMsg);
      }
    } catch (err) {
      error('Lỗi kết nối đến server');
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = getSubtotal();
  const total = getTotalPrice();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        Quay lại giỏ hàng
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">Thanh Toán</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Checkout Info */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Customer Info */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-sm">1</span>
              Thông tin nhận hàng
            </h2>
            <div className="space-y-4 pl-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  value={user?.name || ''} 
                  disabled
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại *</label>
                  <input 
                    type="tel" 
                    required
                    value={phone} 
                    onChange={e => {
                      setPhone(e.target.value.replace(/\D/g, ''));
                      setPhoneError('');
                    }}
                    onBlur={() => setPhoneError(validatePhone(phone))}
                    placeholder="Nhập số điện thoại liên hệ"
                    className={`w-full h-10 px-3 rounded-lg border focus:ring-2 text-sm ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500'}`}
                  />
                  {phoneError && <p className="text-red-500 text-xs mt-1 font-medium">{phoneError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tỉnh / Thành phố *</label>
                  <select 
                    required
                    value={selectedProvince}
                    onChange={handleProvinceChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  >
                    <option value="">-- Chọn Tỉnh/Thành phố --</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quận / Huyện *</label>
                  <select 
                    required
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    disabled={!selectedProvince}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white disabled:bg-slate-50"
                  >
                    <option value="">-- Chọn Quận/Huyện --</option>
                    {districts.map(d => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phường / Xã *</label>
                  <select 
                    required
                    value={selectedWard}
                    onChange={e => setSelectedWard(e.target.value)}
                    disabled={!selectedDistrict}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white disabled:bg-slate-50"
                  >
                    <option value="">-- Chọn Phường/Xã --</option>
                    {wards.map(w => (
                      <option key={w.code} value={w.code}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ cụ thể (Số nhà, tên đường) *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={streetAddress} 
                    onChange={e => setStreetAddress(e.target.value)}
                    placeholder="VD: 123 Nguyễn Huệ"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú (Tùy chọn)</label>
                <textarea 
                  value={note} 
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú về thời gian giao hàng, hướng dẫn chỉ đường..."
                  rows={2}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-slate-400 custom-scrollbar"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Payment Method */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-sm">2</span>
              Phương thức thanh toán
            </h2>
            <div className="pl-8 space-y-3">
              <label 
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex h-5 items-center">
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="COD" 
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600" 
                  />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Thanh toán khi nhận hàng (COD)</div>
                  <div className="text-sm text-slate-500 mt-1">Khách hàng thanh toán tiền mặt cho nhân viên giao hàng khi sản phẩm được giao tới.</div>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'ONLINE' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex h-5 items-center">
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="ONLINE" 
                    checked={paymentMethod === 'ONLINE'}
                    onChange={() => setPaymentMethod('ONLINE')}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600" 
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                      Thanh toán qua VNPAY
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Khuyên dùng</span>
                    </div>
                    <CreditCard className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Hệ thống sẽ chuyển hướng bạn đến cổng thanh toán VNPAY (Thẻ ATM nội địa, QR Pay, Thẻ quốc tế).</div>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-5">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 sticky top-28">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              Đơn hàng của bạn
            </h2>

            {/* Items List */}
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item) => {
                const primaryImage = item.product.images?.find(img => img.isPrimary)?.url || item.product.images?.[0]?.url;
                const price = item.variant?.price || item.product.price;
                const targetId = `${item.product.id}-${item.variant?.id || 'none'}`;
                return (
                  <div key={targetId} className="flex gap-4">
                    <div className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-white">
                      <Image src={getFullImageUrl(primaryImage)} alt={item.product.name} fill className="object-cover" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center justify-center transform scale-75">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="text-sm font-semibold text-slate-900 line-clamp-1">{item.product.name}</div>
                      {item.variant && <div className="text-xs text-slate-500 mt-0.5">{item.variant.name}</div>}
                      <div className="text-xs text-slate-500 mt-0.5">SL: {item.quantity}</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 flex items-center">
                      {formatVND(Number(price) * item.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="border-slate-200 mb-6" />

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Tạm tính</span>
                <span className="font-medium text-slate-900">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Phí giao hàng</span>
                <span className="font-medium text-slate-900">Miễn phí</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between items-center text-sm text-emerald-600 font-medium">
                  <span>Mã giảm giá ({appliedCoupon.code})</span>
                  <span>-{formatVND(appliedCoupon.discountAmount)}</span>
                </div>
              )}
            </div>

            <hr className="border-slate-200 mb-6" />

            <div className="flex justify-between items-end mb-8">
              <span className="text-base font-semibold text-slate-900">Tổng thanh toán</span>
              <span className="text-2xl font-extrabold text-indigo-600 block leading-none">
                {formatVND(total)}
              </span>
            </div>

            <Button 
              type="submit"
              size="lg" 
              disabled={submitting || items.length === 0}
              className="w-full text-base font-semibold rounded-xl"
            >
              {submitting ? 'Đang xử lý...' : 'Đặt hàng ngay'}
            </Button>
            
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Giao dịch của bạn được mã hóa an toàn 256-bit
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
