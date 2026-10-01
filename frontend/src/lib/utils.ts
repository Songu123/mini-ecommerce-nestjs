import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 ₫";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
}

export function getFullImageUrl(url: string | null | undefined): string {
  if (!url) return "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const backendBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
