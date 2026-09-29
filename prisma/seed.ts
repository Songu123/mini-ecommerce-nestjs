import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu dọn dẹp và seed dữ liệu mới...');

  // 1. Dọn dẹp dữ liệu cũ theo đúng quan hệ khóa ngoại
  await prisma.review.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Đã xóa sạch dữ liệu cũ.');

  // 2. Tạo Users (Admin & Customers)
  const defaultPassword = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: defaultPassword,
      name: 'Quản Trị Viên (Admin)',
      role: Role.ADMIN,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer1@example.com',
      password: defaultPassword,
      name: 'Nguyễn Văn Sơn',
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@example.com',
      password: defaultPassword,
      name: 'Trần Thị Mai',
      role: Role.CUSTOMER,
    },
  });

  console.log('👤 Đã tạo 3 người dùng mẫu (Mật khẩu: Password123!)');

  // 3. Tạo Danh mục (Categories)
  const catPhone = await prisma.category.create({
    data: {
      name: 'Điện thoại & Tablet',
      description: 'Smartphone, máy tính bảng các thương hiệu Apple, Samsung, Xiaomi...',
    },
  });

  const catLaptop = await prisma.category.create({
    data: {
      name: 'Laptop & Máy tính',
      description: 'Laptop văn phòng, gaming, đồ họa, MacBook...',
    },
  });

  const catAudio = await prisma.category.create({
    data: {
      name: 'Thiết bị Âm thanh',
      description: 'Tai nghe Bluetooth, loa thông minh, tai nghe chống ồn...',
    },
  });

  const catAccessories = await prisma.category.create({
    data: {
      name: 'Phụ kiện công nghệ',
      description: 'Củ sạc, cáp sạc nhanh, pin dự phòng, ốp lưng...',
    },
  });

  console.log('📂 Đã tạo 4 danh mục sản phẩm');

  // 4. Tạo 20 Sản phẩm phong phú (20 Products kèm Album ảnh)
  const productsData = [
    // --- Nhóm Điện thoại & Tablet ---
    {
      name: 'iPhone 16 Pro Max 256GB',
      description: 'Chip A18 Pro mạnh mẽ, camera 48MP, khung viền titan tự nhiên cao cấp.',
      price: 34990000,
      stock: 30,
      categoryId: catPhone.id,
      images: [
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800',
      ],
    },
    {
      name: 'Samsung Galaxy S24 Ultra 512GB',
      description: 'Tích hợp Galaxy AI thông minh, bút S-Pen, camera zoom 100x đỉnh cao.',
      price: 31990000,
      stock: 25,
      categoryId: catPhone.id,
      images: [
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800',
      ],
    },
    {
      name: 'iPad Pro M4 11 inch Wi-Fi 256GB',
      description: 'Màn hình OLED Ultra Retina XDR siêu mỏng, chip M4 tối tân.',
      price: 27490000,
      stock: 18,
      categoryId: catPhone.id,
      images: [
        'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
      ],
    },
    {
      name: 'Xiaomi 14 Ultra 5G 16GB/512GB',
      description: 'Hệ thống camera Leica quang học hàng đầu, chip Snapdragon 8 Gen 3.',
      price: 26990000,
      stock: 15,
      categoryId: catPhone.id,
      images: [
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800',
      ],
    },
    {
      name: 'iPad Air 6 M2 11 inch 128GB',
      description: 'Sức mạnh vượt trội từ vi xử lý M2, hỗ trợ Apple Pencil Pro mới.',
      price: 16490000,
      stock: 22,
      categoryId: catPhone.id,
      images: [
        'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800',
      ],
    },

    // --- Nhóm Laptop & Máy tính ---
    {
      name: 'MacBook Pro 14 inch M3 Pro 18GB/512GB',
      description: 'Hiệu năng đồ họa đỉnh cao, thời lượng pin lên đến 22 giờ liên tục.',
      price: 49990000,
      stock: 12,
      categoryId: catLaptop.id,
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800',
      ],
    },
    {
      name: 'MacBook Air 13 inch M3 16GB/256GB',
      description: 'Mỏng nhẹ tuyệt đối, hoạt động êm ái không quạt, pin trâu cả ngày.',
      price: 29990000,
      stock: 20,
      categoryId: catLaptop.id,
      images: [
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800',
      ],
    },
    {
      name: 'ASUS ROG Zephyrus G16 (RTX 4070)',
      description: 'Laptop Gaming mỏng nhẹ, màn hình 240Hz OLED đỉnh cao cho game thủ.',
      price: 52990000,
      stock: 8,
      categoryId: catLaptop.id,
      images: [
        'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800',
      ],
    },
    {
      name: 'Dell XPS 13 Plus 9320 (Core i7)',
      description: 'Thiết kế tương lai, bàn phím cảm ứng ẩn, màn hình 3.5K OLED sắc nét.',
      price: 38990000,
      stock: 10,
      categoryId: catLaptop.id,
      images: [
        'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800',
      ],
    },
    {
      name: 'Lenovo ThinkPad X1 Carbon Gen 12',
      description: 'Đẳng cấp doanh nhân, bàn phím gõ êm nhất thế giới, độ bền chuẩn quân đội.',
      price: 44900000,
      stock: 9,
      categoryId: catLaptop.id,
      images: [
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800',
      ],
    },

    // --- Nhóm Thiết bị Âm thanh ---
    {
      name: 'Tai nghe Apple AirPods Pro 2 (USB-C)',
      description: 'Chống ồn chủ động (ANC) gấp 2 lần, âm thanh thích ứng thông minh.',
      price: 5690000,
      stock: 60,
      categoryId: catAudio.id,
      images: [
        'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800',
      ],
    },
    {
      name: 'Tai nghe Sony WH-1000XM5',
      description: 'Tai nghe chụp tai chống ồn hàng đầu thế giới, thời lượng pin 30h.',
      price: 7990000,
      stock: 35,
      categoryId: catAudio.id,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      ],
    },
    {
      name: 'Loa Bluetooth Marshall Stanmore III',
      description: 'Âm thanh sống động lan tỏa, phong cách cổ điển sang trọng đậm chất Rock.',
      price: 9490000,
      stock: 25,
      categoryId: catAudio.id,
      images: [
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800',
      ],
    },
    {
      name: 'Loa JBL Charge 5 Kháng Nước IP67',
      description: 'Âm bass mạnh mẽ JBL Pro Sound, pin 20 giờ kiêm sạc dự phòng cho điện thoại.',
      price: 3690000,
      stock: 45,
      categoryId: catAudio.id,
      images: [
        'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800',
      ],
    },
    {
      name: 'Tai nghe Gaming Logitech G Pro X 2 Lightspeed',
      description: 'Màng loa Graphene 50mm đột phá, kết nối không dây siêu tốc không độ trễ.',
      price: 5490000,
      stock: 20,
      categoryId: catAudio.id,
      images: [
        'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800',
      ],
    },

    // --- Nhóm Phụ kiện công nghệ ---
    {
      name: 'Củ sạc nhanh Anker GaNPrime 65W 3 cổng',
      description: 'Công nghệ GaN III sạc nhanh 3 thiết bị cùng lúc, kích thước nhỏ gọn.',
      price: 890000,
      stock: 120,
      categoryId: catAccessories.id,
      images: [
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800',
      ],
    },
    {
      name: 'Bàn phím cơ không dây Keychron Q1 Pro',
      description: 'Khung nhôm nguyên khối CNC, switch cơ học cao cấp, kết nối Bluetooth 5.1.',
      price: 4390000,
      stock: 30,
      categoryId: catAccessories.id,
      images: [
        'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800',
      ],
    },
    {
      name: 'Chuột Logitech MX Master 3S',
      description: 'Cảm biến 8000 DPI trên mọi bề mặt, cuộn vô cực MagSpeed, click tĩnh âm.',
      price: 2290000,
      stock: 55,
      categoryId: catAccessories.id,
      images: [
        'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800',
      ],
    },
    {
      name: 'Pin sạc dự phòng Magsafe Anker 10.000mAh',
      description: 'Hít từ tính không dây chuẩn Qi, chân đế gập tiện lợi xem video rảnh tay.',
      price: 1190000,
      stock: 80,
      categoryId: catAccessories.id,
      images: [
        'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800',
      ],
    },
    {
      name: 'Hub chuyển đổi Belkin USB-C 7 in 1',
      description: 'Hỗ trợ xuất hình HDMI 4K 60Hz, sạc pass-through 100W PD, đầu đọc thẻ SD.',
      price: 1490000,
      stock: 65,
      categoryId: catAccessories.id,
      images: [
        'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800',
      ],
    },
  ];

  const createdProducts = [];
  for (const item of productsData) {
    const { images, ...productData } = item;
    const prod = await prisma.product.create({
      data: {
        ...productData,
        images: {
          create: images.map((url, index) => ({
            url,
            isPrimary: index === 0,
          })),
        },
      },
      include: {
        images: true,
      },
    });
    createdProducts.push(prod);
  }

  console.log(`📦 Đã tạo thành công ${createdProducts.length} sản phẩm kèm Album ảnh`);

  // 5. Tạo Mã giảm giá mẫu (Coupons)
  await prisma.coupon.createMany({
    data: [
      {
        code: 'SALE10',
        description: 'Giảm 10% tối đa 500k cho đơn từ 2 triệu',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 2000000,
        maxDiscount: 500000,
        usageLimit: 100,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2030-12-31'),
      },
      {
        code: 'GIAM100K',
        description: 'Giảm trực tiếp 100k cho đơn từ 500k',
        discountType: 'FIXED_AMOUNT',
        discountValue: 100000,
        minOrderValue: 500000,
        usageLimit: 200,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2030-12-31'),
      },
    ],
  });
  console.log('🏷️  Đã tạo 2 mã giảm giá mẫu (SALE10, GIAM100K)');

  // 6. Tạo Đơn hàng mẫu (Orders & Items)
  const order1 = await prisma.order.create({
    data: {
      userId: customer1.id,
      totalAmount: 34990000 + 5690000,
      status: OrderStatus.DELIVERED,
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 1,
            price: 34990000,
          },
          {
            productId: createdProducts[10].id,
            quantity: 1,
            price: 5690000,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: customer2.id,
      totalAmount: 890000 * 2,
      status: OrderStatus.DELIVERED,
      items: {
        create: [
          {
            productId: createdProducts[15].id,
            quantity: 2,
            price: 890000,
          },
        ],
      },
    },
  });

  console.log('📑 Đã tạo 2 đơn hàng mẫu DELIVERED');

  // 7. Tạo Đánh giá mẫu (Verified Reviews)
  await prisma.review.create({
    data: {
      userId: customer1.id,
      productId: createdProducts[0].id,
      rating: 5,
      comment: 'Máy iPhone 16 Pro Max màu titan sa mạc cực đẹp, pin dùng 2 ngày không hết!',
    },
  });

  await prisma.review.create({
    data: {
      userId: customer2.id,
      productId: createdProducts[15].id,
      rating: 5,
      comment: 'Củ sạc Anker nhỏ gọn, sạc nhanh cho cả MacBook và iPhone cùng lúc rất tiện.',
    },
  });

  console.log('⭐ Đã tạo 2 đánh giá mẫu');
  console.log('🎉 Quá trình Seed dữ liệu 20 sản phẩm hoàn tất thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
