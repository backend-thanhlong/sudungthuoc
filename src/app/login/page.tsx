"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
            <Card className="w-full max-w-md bg-white border-gray-100 shadow-xl">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto flex items-center justify-center mb-4">
                        <div className="relative w-32 h-32">
                            <img
                                src="/logo.png"
                                alt="Logo Sở Y Tế"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-blue-900">KHO THUỐC CSYT</CardTitle>
                    <CardDescription className="text-blue-600">
                        Hệ thống quản lý sử dụng thuốc - Sở Y Tế TP Cần Thơ
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-blue-800">Tên đăng nhập</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Nhập tên đăng nhập"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-blue-50/50 border-blue-200 text-blue-900 placeholder:text-blue-400 focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-blue-800">Mật khẩu</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-blue-50/50 border-blue-200 text-blue-900 placeholder:text-blue-400 focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-md"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang đăng nhập...
                                </div>
                            ) : (
                                "Đăng nhập"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-blue-100 text-center">
                        <p className="text-blue-600 text-sm">
                            © 2026 Sở Y Tế - Hệ thống Quản lý Dược
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
