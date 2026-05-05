import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản Lý Dược Tập Trung - Sở Y Tế",
  description: "Hệ thống quản lý sử dụng thuốc tập trung cho Sở Y Tế",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
