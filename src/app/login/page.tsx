"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CircleAlert,
  FileText,
  Loader2,
  Pill,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const platformHighlights = [
  {
    title: "Cập nhật số liệu mua sắm và sử dụng thuốc",
    description: "Chuẩn hóa dữ liệu đầu vào phục vụ theo dõi thường xuyên tại từng cơ sở.",
    icon: Pill,
  },
  {
    title: "Theo dõi báo cáo và tiến độ thực hiện",
    description: "Tập trung các đầu việc cần báo cáo để cơ sở cập nhật đúng hạn và đúng biểu mẫu.",
    icon: FileText,
  },
  {
    title: "Chuẩn hóa dữ liệu phục vụ tổng hợp, điều hành",
    description: "Hỗ trợ tổng hợp số liệu tin cậy cho công tác quản lý và điều hành chuyên môn.",
    icon: ShieldCheck,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Tên đăng nhập hoặc mật khẩu không đúng");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#081521] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.2),transparent_28%),linear-gradient(135deg,#081521_0%,#0e2538_52%,#133754_100%)]" />
      <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-cyan-300/[0.18] blur-3xl" />
      <div className="absolute bottom-8 right-0 h-72 w-72 rounded-full bg-sky-400/[0.18] blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <section className="rounded-[30px] border border-white/10 bg-white/[0.08] p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-sm sm:p-8 lg:p-10">
            <div className="flex h-full flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-medium text-cyan-50">
                <Building2 className="size-4 text-cyan-200" />
                Sở Y Tế TP Cần Thơ
              </div>

              <div className="max-w-2xl space-y-5">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-100/80">
                  Nền tảng quản lý tập trung
                </p>
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                  Phần mềm quản lý Mua sắm và sử dụng thuốc
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                  Hỗ trợ cơ sở y tế cập nhật dữ liệu mua sắm, sử dụng thuốc và tổng hợp báo cáo
                  phục vụ quản lý, điều hành.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {platformHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/10 bg-slate-950/[0.18] p-5 shadow-lg shadow-slate-950/20"
                  >
                    <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3 text-cyan-100">
                      <item.icon className="size-5" />
                    </div>
                    <h2 className="text-base font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-200/90">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="flex items-center justify-center">
            <Card className="w-full max-w-xl overflow-hidden rounded-[30px] border border-white/70 bg-white/95 text-slate-900 shadow-[0_32px_80px_rgba(8,21,33,0.28)] backdrop-blur">
              <CardHeader className="gap-6 border-b border-slate-100 px-6 py-6 sm:px-8">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                    <Image
                      src="/logo.png"
                      alt="Logo Sở Y Tế"
                      className="object-contain p-2"
                      fill
                      sizes="64px"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Cổng truy cập phần mềm
                    </p>
                    <CardTitle className="text-2xl text-slate-950">Đăng nhập hệ thống</CardTitle>
                    <CardDescription className="text-sm leading-6 text-slate-600">
                      Nhập thông tin tài khoản để truy cập phần mềm quản lý.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-sm font-medium text-slate-800">
                        Tên đăng nhập
                      </Label>
                      <p className="text-xs leading-5 text-slate-500">
                        Sử dụng Mã cơ sở được cấp làm tên đăng nhập
                      </p>
                    </div>
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      placeholder="Nhập Mã cơ sở"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/25"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-800">
                      Mật khẩu
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/25"
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full rounded-xl bg-slate-950 text-white shadow-lg shadow-cyan-500/15 hover:bg-slate-900"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      <>
                        Đăng nhập
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-medium text-slate-800">Hỗ trợ đăng nhập</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Nếu không đăng nhập được hoặc quên mật khẩu, vui lòng liên hệ quản trị hệ
                    thống.
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
                  © 2026 Sở Y Tế - Hệ thống Quản lý Dược
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
