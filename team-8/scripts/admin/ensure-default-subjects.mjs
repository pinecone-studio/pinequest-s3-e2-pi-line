import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultSubjects = [
  { name: "Математик", description: "Математикийн шалгалт, бодлогууд" },
  { name: "Монгол хэл", description: "Монгол хэл, уран зохиолын агуулга" },
  { name: "Англи хэл", description: "Англи хэлний чадварын шалгалтууд" },
  { name: "Физик", description: "Физикийн ойлголт, тооцоолол" },
  { name: "Хими", description: "Химийн томьёо, урвал, тооцоолол" },
  { name: "Биологи", description: "Биологийн агуулга ба шалгалтууд" },
  { name: "Түүх", description: "Монгол болон дэлхийн түүх" },
  { name: "Нийгэм судлал", description: "Нийгмийн ухаан, иргэний боловсрол" },
  { name: "Мэдээлэл зүй", description: "Програмчлал, мэдээллийн технологи" },
  { name: "Газарзүй", description: "Газарзүйн агуулга, газрын зураг" },
  { name: "Иргэний ёс зүй", description: "Ёс зүй, харилцаа, иргэний боловсрол" },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..", "..");

function applyEnvFile(fileName) {
  const filePath = resolve(APP_ROOT, fileName);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

applyEnvFile(".env.local");
applyEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase admin client is not configured.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const { data: existingSubjects, error: subjectError } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name", { ascending: true });

  if (subjectError) {
    throw new Error(`Failed to read subjects: ${subjectError.message}`);
  }

  const existingNames = new Set(
    (existingSubjects ?? []).map((subject) => String(subject.name).trim().toLowerCase()),
  );
  const missingSubjects = defaultSubjects.filter(
    (subject) => !existingNames.has(subject.name.trim().toLowerCase()),
  );

  if (missingSubjects.length === 0) {
    console.info("Default subjects already exist.");
    return;
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await supabase.from("subjects").insert(
    missingSubjects.map((subject) => ({
      ...subject,
      created_by: adminProfile?.id ?? null,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to insert default subjects: ${insertError.message}`);
  }

  console.info(`Inserted ${missingSubjects.length} default subjects.`);
}

await main();
