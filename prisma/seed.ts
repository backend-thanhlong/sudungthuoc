import "dotenv/config";
import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding database...");

    const isProduction = process.env.NODE_ENV === "production";
    const allowProductionSeed = process.env.ALLOW_PRODUCTION_SEED === "true";

    if (isProduction && !allowProductionSeed) {
        throw new Error("Production seed is disabled. Set ALLOW_PRODUCTION_SEED=true to run it explicitly.");
    }

    if (isProduction) {
        const adminUsername = process.env.SEED_ADMIN_USERNAME?.trim() || "admin";
        const adminPasswordInput = process.env.SEED_ADMIN_PASSWORD?.trim();

        if (!adminPasswordInput) {
            throw new Error("SEED_ADMIN_PASSWORD is required when seeding production.");
        }

        const adminPassword = await bcrypt.hash(adminPasswordInput, 10);
        const admin = await prisma.user.upsert({
            where: { username: adminUsername },
            update: {
                passwordHash: adminPassword,
                role: "ADMIN",
                facilityName: "Sở Y Tế",
                isActive: true,
            },
            create: {
                username: adminUsername,
                passwordHash: adminPassword,
                role: "ADMIN",
                facilityName: "Sở Y Tế",
                isActive: true,
            },
        });

        console.log("✅ Created production admin user:", admin.username);
        console.log("🎉 Production seed completed!");
        return;
    }

    // Create Admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.upsert({
        where: { username: "admin" },
        update: {},
        create: {
            username: "admin",
            passwordHash: adminPassword,
            role: "ADMIN",
            facilityName: "Sở Y Tế",
            isActive: true,
        },
    });
    console.log("✅ Created admin user:", admin.username);

    // Create sample facility users
    const facilityPassword = await bcrypt.hash("123456", 10);

    const facility1 = await prisma.user.upsert({
        where: { username: "bvdktinh" },
        update: {},
        create: {
            username: "bvdktinh",
            passwordHash: facilityPassword,
            role: "FACILITY",
            facilityName: "Bệnh viện Đa khoa Tỉnh",
            facilityCode: "BVDKT",
            isActive: true,
        },
    });
    console.log("✅ Created facility user:", facility1.username);

    const facility2 = await prisma.user.upsert({
        where: { username: "ttythuyen" },
        update: {},
        create: {
            username: "ttythuyen",
            passwordHash: facilityPassword,
            role: "FACILITY",
            facilityName: "Trung tâm Y tế Huyện A",
            facilityCode: "TTYTHA",
            isActive: true,
        },
    });
    console.log("✅ Created facility user:", facility2.username);

    const seedSampleCompany = process.env.SEED_SAMPLE_COMPANY === "true";

    if (seedSampleCompany) {
        const companyPasswordInput = process.env.SEED_SAMPLE_COMPANY_PASSWORD?.trim() || "company123";
        const companyPassword = await bcrypt.hash(companyPasswordInput, 10);
        const companyCode = process.env.SEED_SAMPLE_COMPANY_CODE?.trim() || "CTYDUOC01";
        const companyName = process.env.SEED_SAMPLE_COMPANY_NAME?.trim() || "Công ty Dược Thí điểm";
        const companyUsername = process.env.SEED_SAMPLE_COMPANY_USERNAME?.trim() || "ctyduocthidiem";

        const company = await prisma.company.upsert({
            where: { code: companyCode },
            update: {
                name: companyName,
                isActive: true,
            },
            create: {
                code: companyCode,
                name: companyName,
                contactPerson: "Phòng kinh doanh",
                phoneNumber: "0900000000",
                email: "pilot-company@example.com",
                address: "Khu công nghiệp thí điểm",
                isActive: true,
            },
        });

        const companyUser = await prisma.user.upsert({
            where: { username: companyUsername },
            update: {
                passwordHash: companyPassword,
                role: "COMPANY",
                companyId: company.id,
                isActive: true,
                facilityName: null,
                facilityCode: null,
            },
            create: {
                username: companyUsername,
                passwordHash: companyPassword,
                role: "COMPANY",
                companyId: company.id,
                isActive: true,
            },
        });

        console.log("✅ Created sample company:", company.name);
        console.log("✅ Created company user:", companyUser.username);
    }

    // Create sample Master Drugs
    const sampleDrugs = [
        {
            maChung: "MC001",
            maBhyt: "BHYT001",
            tenThuoc: "Paracetamol 500mg",
            hoatChat: "Paracetamol",
            hamLuong: "500mg",
            soDangKy: "VD-12345-19",
            quyCach: "Hộp 10 vỉ x 10 viên",
            donViTinh: "Viên",
        },
        {
            maChung: "MC002",
            maBhyt: "BHYT002",
            tenThuoc: "Amoxicillin 500mg",
            hoatChat: "Amoxicillin",
            hamLuong: "500mg",
            soDangKy: "VD-23456-20",
            quyCach: "Hộp 2 vỉ x 10 viên",
            donViTinh: "Viên",
        },
        {
            maChung: "MC003",
            maBhyt: "BHYT003",
            tenThuoc: "Omeprazol 20mg",
            hoatChat: "Omeprazole",
            hamLuong: "20mg",
            soDangKy: "VD-34567-21",
            quyCach: "Hộp 3 vỉ x 10 viên",
            donViTinh: "Viên",
        },
        {
            maChung: "MC004",
            maBhyt: "BHYT004",
            tenThuoc: "Metformin 500mg",
            hoatChat: "Metformin",
            hamLuong: "500mg",
            soDangKy: "VD-45678-20",
            quyCach: "Hộp 5 vỉ x 10 viên",
            donViTinh: "Viên",
        },
        {
            maChung: "MC005",
            maBhyt: "BHYT005",
            tenThuoc: "Amlodipine 5mg",
            hoatChat: "Amlodipine",
            hamLuong: "5mg",
            soDangKy: "VD-56789-21",
            quyCach: "Hộp 3 vỉ x 10 viên",
            donViTinh: "Viên",
        },
    ];

    for (const drug of sampleDrugs) {
        await prisma.masterDrug.upsert({
            where: { maChung: drug.maChung },
            update: {},
            create: drug,
        });
    }
    console.log("✅ Created", sampleDrugs.length, "sample master drugs");

    console.log("🎉 Seeding completed!");
}

main()
    .then(async () => {
        await prisma.$disconnect();
        await pool.end();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        await pool.end();
        process.exit(1);
    });
