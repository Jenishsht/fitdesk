import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const day = 86_400_000;
const dateOnly = (d: Date) => new Date(d.toISOString().slice(0, 10) + "T00:00:00.000Z");
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function main() {
  const hash = await bcrypt.hash("Password@123", 12);

  await db.saasPlan.createMany({
    skipDuplicates: true,
    data: [
      { code: "BASIC", name: "Basic", monthlyPrice: 1500, yearlyPrice: 15000, memberLimit: 100, features: ["Member management", "Membership management", "Payment records"] },
      { code: "STANDARD", name: "Standard", monthlyPrice: 3000, yearlyPrice: 30000, memberLimit: 500, features: ["WhatsApp notifications", "Reports", "Attendance"] },
      { code: "PREMIUM", name: "Premium", monthlyPrice: 5500, yearlyPrice: 55000, memberLimit: 5000, features: ["Advanced analytics", "QR attendance", "Staff management"] },
    ],
  });
  const standard = await db.saasPlan.findUniqueOrThrow({ where: { code: "STANDARD" } });

  await db.user.upsert({
    where: { email: "admin@fitdesk.test" }, update: {},
    create: { name: "FitDesk Admin", email: "admin@fitdesk.test", passwordHash: hash, platformRole: "SUPER_ADMIN" },
  });

  if (await db.gym.findUnique({ where: { slug: "iron-peak-fitness" } })) { console.log("Demo gym already exists."); return; }

  const owner = await db.user.create({ data: { name: "Sanjay Shrestha", email: "owner@ironpeak.test", phone: "9800000001", passwordHash: hash } });
  const staff = await db.user.create({ data: { name: "Anita Gurung", email: "staff@ironpeak.test", phone: "9800000002", passwordHash: hash } });
  const gym = await db.gym.create({ data: { name: "Iron Peak Fitness", slug: "iron-peak-fitness", phone: "9800000001", email: "owner@ironpeak.test", address: "Baneshwor, Kathmandu" } });
  await db.gymUser.createMany({ data: [
    { gymId: gym.id, userId: owner.id, role: "GYM_OWNER" },
    { gymId: gym.id, userId: staff.id, role: "GYM_STAFF", permissions: ["members.manage", "payments.record", "attendance.manage"] },
  ] });
  await db.gymSubscription.create({ data: { gymId: gym.id, saasPlanId: standard.id, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * day) } });

  const plans = await Promise.all([
    db.membershipPlan.create({ data: { gymId: gym.id, name: "Monthly", durationDays: 30, price: 2500, features: ["Gym floor access", "Locker"] } }),
    db.membershipPlan.create({ data: { gymId: gym.id, name: "Quarterly", durationDays: 90, price: 6500, features: ["Gym floor access", "Locker", "1 PT session"] } }),
    db.membershipPlan.create({ data: { gymId: gym.id, name: "Yearly", durationDays: 365, price: 22000, features: ["Gym floor access", "Locker", "Monthly body scan"] } }),
  ]);

  const names = ["Aarav Thapa","Bina Rai","Chirag Karki","Dipa Tamang","Eshan Joshi","Furba Sherpa","Gita Basnet","Hari Adhikari","Isha Pandey","Jiwan Magar",
    "Kriti Shah","Laxman Bhandari","Manisha Lama","Nabin Khadka","Oja Neupane","Prakash Dahal","Rina Maharjan","Suman Poudel","Tara Ghimire","Umesh Acharya",
    "Vina Subedi","Yogesh Rana","Zenisha Koirala","Arjun Bista","Bimala Chaudhary"];
  const methods = ["CASH", "ESEWA", "KHALTI", "QR", "BANK_TRANSFER"] as const;
  const today = dateOnly(new Date());

  for (let i = 0; i < names.length; i++) {
    const joined = new Date(Date.now() - Math.floor(Math.random() * 170) * day);
    const m = await db.member.create({ data: { gymId: gym.id, fullName: names[i], phone: `98${String(41000000 + i * 137).padStart(8, "0")}`, gender: i % 2 ? "Female" : "Male", joinedAt: dateOnly(joined), createdAt: joined } });
    const plan = pick(plans);
    const start = new Date(joined.getTime() + Math.floor(Math.random() * 10) * day);
    const startD = dateOnly(start);
    const endD = new Date(startD.getTime() + plan.durationDays * day);
    const finalPrice = Number(plan.price);
    const paidFull = Math.random() > 0.25;
    const ms = await db.membership.create({ data: { gymId: gym.id, memberId: m.id, planId: plan.id, startDate: startD, endDate: endD, price: finalPrice, finalPrice } });
    await db.payment.create({ data: { gymId: gym.id, memberId: m.id, membershipId: ms.id, amount: paidFull ? finalPrice : Math.round(finalPrice / 2), status: paidFull ? "PAID" : "PARTIAL", method: pick([...methods]), paidAt: start, recordedById: owner.id } });
    if (endD >= today && startD <= today && Math.random() > 0.4) {
      await db.attendance.create({ data: { gymId: gym.id, memberId: m.id, date: today } });
    }
  }

  // Demo member login (linked to first member)
  const mUser = await db.user.create({ data: { name: names[0], email: "member@ironpeak.test", passwordHash: hash } });
  await db.member.updateMany({ where: { gymId: gym.id, fullName: names[0] }, data: { userId: mUser.id, email: "member@ironpeak.test" } });
  console.log("Seeded. Logins (password Password@123): admin@fitdesk.test, owner@ironpeak.test, staff@ironpeak.test, member@ironpeak.test");
}

main().finally(() => db.$disconnect());
