import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu dọn dẹp và seed dữ liệu...');

  // 1. Dọn dẹp dữ liệu cũ theo thứ tự quan hệ khoá ngoại
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Đã xóa sạch dữ liệu cũ.');

  // 2. Tạo Users (Admin & Customers)
  const defaultPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecommerce.com',
      password: defaultPassword,
      name: 'Quản Trị Viên (Admin)',
      role: Role.ADMIN,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'son.nguyen@example.com',
      password: defaultPassword,
      name: 'Nguyễn Văn Sơn',
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'mai.tran@example.com',
      password: defaultPassword,
      name: 'Trần Thị Mai',
      role: Role.CUSTOMER,
    },
  });

  console.log('👤 Đã tạo 3 người dùng mẫu (Mật khẩu chung: 123456)');

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
      name: 'Thiết bị âm thanh',
      description: 'Tai nghe Bluetooth, loa thông minh, tai nghe chống ồn...',
    },
  });

  const catAccessories = await prisma.category.create({
    data: {
      name: 'Phụ kiện công nghệ',
      description: 'Củ sạc, cáp sạc nhanh, pin dự phòng, ốp lưng...',
    },
  });

  console.log('🏷️ Đã tạo 4 danh mục sản phẩm');

  // 4. Tạo Sản phẩm (Products)
  const productsData = [
    {
      name: 'iPhone 16 Pro Max 256GB',
      description: 'Chip A18 Pro mạnh mẽ, camera 48MP, titan tự nhiên cao cấp.',
      price: 34990000,
      stock: 25,
      categoryId: catPhone.id,
    },
    {
      name: 'Samsung Galaxy S24 Ultra 512GB',
      description: 'Tích hợp Galaxy AI thông minh, bút S-Pen, zoom 100x đỉnh cao.',
      price: 31990000,
      stock: 18,
      categoryId: catPhone.id,
    },
    {
      name: 'iPad Pro M4 11 inch Wi-Fi 256GB',
      description: 'Màn hình OLED Ultra Retina XDR siêu mỏng, chip M4 tối tân.',
      price: 27490000,
      stock: 15,
      categoryId: catPhone.id,
    },
    {
      name: 'MacBook Pro 14 inch M3 Pro 18GB/512GB',
      description: 'Hiệu năng đồ họa đỉnh cao, thời lượng pin lên đến 22 giờ liên tục.',
      price: 49990000,
      stock: 10,
      categoryId: catLaptop.id,
    },
    {
      name: 'Laptop ASUS ROG Zephyrus G16 (RTX 4070)',
      description: 'Laptop Gaming mỏng nhẹ, màn hình 240Hz OLED đỉnh cao cho game thủ.',
      price: 52990000,
      stock: 8,
      categoryId: catLaptop.id,
    },
    {
      name: 'Dell XPS 13 Plus 9320 (Core i7)',
      description: 'Thiết kế tương lai, bàn phím cảm ứng ẩn, màn hình 3.5K OLED sắc nét.',
      price: 38990000,
      stock: 12,
      categoryId: catLaptop.id,
    },
    {
      name: 'Tai nghe Apple AirPods Pro 2 (USB-C)',
      description: 'Chống ồn chủ động (ANC) gấp 2 lần, âm thanh thích ứng thông minh.',
      price: 5690000,
      stock: 50,
      categoryId: catAudio.id,
    },
    {
      name: 'Tai nghe Sony WH-1000XM5',
      description: 'Tai nghe chụp tai chống ồn hàng đầu thế giới, thời lượng pin 30h.',
      price: 7990000,
      stock: 30,
      categoryId: catAudio.id,
    },
    {
      name: 'Loa Bluetooth Marshall Stanmore III',
      description: 'Âm thanh sống động lan tỏa, phong cách cổ điển sang trọng.',
      price: 9490000,
      stock: 20,
      categoryId: catAudio.id,
    },
    {
      name: 'Củ sạc nhanh Anker GaNPrime 65W 3 cổng',
      description: 'Công nghệ GaN III sạc nhanh 3 thiết bị cùng lúc, kích thước nhỏ gọn.',
      price: 890000,
      stock: 100,
      categoryId: catAccessories.id,
    },
  ];

  const createdProducts = [];
  for (const item of productsData) {
    const prod = await prisma.product.create({ data: item });
    createdProducts.push(prod);
  }

  console.log(`📦 Đã tạo ${createdProducts.length} sản phẩm công nghệ`);

  // 5. Tạo Đơn hàng mẫu (Orders & OrderItems)
  const order1 = await prisma.order.create({
    data: {
      userId: customer1.id,
      totalAmount: 34990000 + 5690000, // iPhone 16 Pro Max + AirPods Pro 2
      status: OrderStatus.CONFIRMED,
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 1,
            price: 34990000,
          },
          {
            productId: createdProducts[6].id,
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
      totalAmount: 890000 * 2, // 2 củ sạc Anker
      status: OrderStatus.DELIVERED,
      items: {
        create: [
          {
            productId: createdProducts[9].id,
            quantity: 2,
            price: 890000,
          },
        ],
      },
    },
  });

  console.log('🧾 Đã tạo 2 đơn hàng mẫu');
  console.log('✅ Seed dữ liệu hoàn tất thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
