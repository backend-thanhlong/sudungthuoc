import { auth } from "@/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PublicDashboardProviders from "@/components/public-dashboard/PublicDashboardProviders";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { getPublicHomepageSettings } from "@/lib/public-homepage-settings";
import Image from "next/image";
import Link from "next/link";

function getWatermarkPositionStyle(position: string) {
  if (position === "bottom-right") {
    return {
      right: "max(1.5rem, 4vw)",
      bottom: "max(1.5rem, 4vw)",
    };
  }

  if (position === "bottom-left") {
    return {
      left: "max(1.5rem, 4vw)",
      bottom: "max(1.5rem, 4vw)",
    };
  }

  return {
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  };
}

export default async function HomePage() {
  const session = await auth();
  const [reportPeriods, facilities, homepageSettings] = await Promise.all([
    prisma.reportPeriod.findMany({
      orderBy: [
        { year: "desc" },
        { periodMonth: "desc" },
      ],
      select: {
        month: true,
      },
    }),
    prisma.user.findMany({
      where: {
        role: "FACILITY",
        isActive: true,
      },
      select: {
        id: true,
        facilityName: true,
        facilityType: true,
      },
      orderBy: {
        facilityName: "asc",
      },
    }),
    getPublicHomepageSettings(),
  ]);

  const actionHref = session?.user
    ? session.user.role === "ADMIN"
      ? "/dashboard/admin"
      : session.user.role === "COMPANY"
        ? "/dashboard/company"
        : "/dashboard/facility"
    : "/login";

  return (
    <PublicDashboardProviders session={session}>
      <main className="relative isolate min-h-screen overflow-hidden text-foreground" style={{ backgroundColor: homepageSettings.backgroundColor }}>
        {homepageSettings.watermark.enabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-0 bg-contain bg-center bg-no-repeat grayscale"
            style={{
              backgroundImage: "url('/logo.png')",
              opacity: homepageSettings.watermark.opacity,
              width: `clamp(180px, ${homepageSettings.watermark.size}px, 70vw)`,
              aspectRatio: "1 / 1",
              ...getWatermarkPositionStyle(homepageSettings.watermark.position),
            }}
          />
        )}
        <div className="relative z-10 flex min-h-screen w-full flex-col">
          <header
            className="flex flex-col gap-4 border-b px-4 py-4 shadow-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
            style={{
              backgroundColor: homepageSettings.header.backgroundColor,
              borderColor: homepageSettings.header.backgroundColor,
            }}
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              {homepageSettings.header.logoEnabled && (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-white/80 p-1.5 shadow-sm ring-1 ring-border sm:size-16">
                  <Image
                    src="/logo.png"
                    alt="Logo Sở Y tế TP Cần Thơ"
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              )}
              <div className="min-w-0">
                <h1
                  className="text-lg font-bold uppercase leading-tight tracking-normal sm:text-2xl lg:text-3xl"
                  style={{ color: homepageSettings.header.textColor }}
                >
                  {homepageSettings.header.title}
                </h1>
                <p
                  className="mt-1 text-sm font-semibold uppercase leading-snug sm:text-base lg:text-lg"
                  style={{ color: homepageSettings.header.subTextColor }}
                >
                  {homepageSettings.header.subtitle}
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="w-full sm:w-fit">
              <Link href={actionHref}>{session?.user ? "Vào hệ thống" : "Đăng nhập"}</Link>
            </Button>
          </header>

          <div className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <DashboardShell
              reportPeriods={reportPeriods.map((period) => period.month)}
              facilities={facilities.map((facility) => ({
                id: facility.id,
                name: facility.facilityName || "Unknown",
                type: facility.facilityType || "",
              }))}
              apiPrefix="/api/public/dashboard"
              masterDrugApiUrl="/api/public/master-drugs"
            />
          </div>

          <footer
            className="border-t border-border/70 px-4 py-4 text-center text-sm font-medium leading-6 backdrop-blur-sm sm:text-base"
            style={{
              backgroundColor: homepageSettings.footer.backgroundColor,
              color: homepageSettings.footer.textColor,
            }}
          >
            <p className="font-bold uppercase">{homepageSettings.footer.title}</p>
            <p>{homepageSettings.footer.address}</p>
          </footer>
        </div>
      </main>
    </PublicDashboardProviders>
  );
}
