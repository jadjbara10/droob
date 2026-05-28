/**
 * إنشاء مستخدم مدير — Create Admin User
 * Usage: npx tsx drizzle/create-admin.ts
 */
import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcrypt";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://droob:droob_password@localhost:5432/droob";

async function createAdmin() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  const email = "jadjbara@live.com";
  const password = "Jad@12345";
  const name = "مدير النظام";
  const role = "super_admin";
  const preferredLang = "ar";

  console.log("🔑 جاري إنشاء مستخدم المدير...\n");

  // Check if user already exists
  const existing = await sql`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) {
    console.log(`⚠️  المستخدم ${email} موجود مسبقاً (ID: ${existing[0].id})`);
    // Update password anyway
    const hashedPassword = await bcrypt.hash(password, 12);
    await sql`UPDATE users SET password_hash = ${hashedPassword}, role = ${role}, name = ${name}, is_verified = true WHERE email = ${email}`;
    console.log(`✅ تم تحديث كلمة المرور والصلاحيات للمستخدم ${email}`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, name, preferred_lang, role, is_verified)
      VALUES (${email}, ${hashedPassword}, ${name}, ${preferredLang}, ${role}, true)
      RETURNING id, email, name, role
    `;
    console.log(`✅ تم إنشاء المستخدم بنجاح:`);
    console.log(`   البريد: ${user.email}`);
    console.log(`   الاسم: ${user.name}`);
    console.log(`   الصلاحية: ${user.role}`);
    console.log(`   ID: ${user.id}`);
  }

  console.log(`\n🔐 يمكنك الآن تسجيل الدخول إلى لوحة التحكم:`);
  console.log(`   البريد الإلكتروني: ${email}`);
  console.log(`   كلمة المرور: ${password}`);
  console.log("");

  await sql.end();
}

createAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ فشل إنشاء المستخدم:", err);
    process.exit(1);
  });