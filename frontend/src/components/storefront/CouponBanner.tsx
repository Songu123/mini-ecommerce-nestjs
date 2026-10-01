'use client';

import React, { useState } from 'react';
import { Tag, Copy, Check } from 'lucide-react';

interface Voucher {
  code: string;
  discount: string;
  description: string;
  minSpend: string;
}

const VOUCHERS: Voucher[] = [
  {
    code: 'SALE10',
    discount: 'Giảm 10%',
    description: 'Áp dụng cho mọi đơn hàng điện tử',
    minSpend: 'Đơn từ 500k',
  },
  {
    code: 'GIAM100K',
    discount: 'Giảm 100.000đ',
    description: 'Ưu đãi đơn hàng công nghệ cao cấp',
    minSpend: 'Đơn từ 2 triệu',
  },
];

export function CouponBanner() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section id="vouchers" className="my-8">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mã Giảm Giá Hot Hôm Nay</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VOUCHERS.map((v) => (
          <div
            key={v.code}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-white border border-slate-200 shadow-sm relative overflow-hidden group"
          >
            {/* Left accent border */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
            
            <div className="space-y-1.5 pl-2 mb-3 sm:mb-0">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700">
                  {v.discount}
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {v.minSpend}
                </span>
              </div>
              <p className="text-sm text-slate-600">{v.description}</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto pl-2 sm:pl-4 sm:border-l border-slate-200 border-dashed">
              <div className="flex-1 sm:flex-none py-1.5 px-3 bg-slate-50 border border-slate-200 rounded font-mono text-sm font-bold text-slate-700 text-center uppercase tracking-wider">
                {v.code}
              </div>
              <button
                onClick={() => handleCopy(v.code)}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                aria-label={`Sao chép mã ${v.code}`}
              >
                {copiedCode === v.code ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
