/**
 * Generate a fake 30-person comp CSV for the demo.
 * Run: pnpm seed:comp > apps/web/public/demo-comp.csv
 */
const ROLES = ["engineer", "designer", "ops", "founder"] as const;
const COUNTRIES = ["US", "IN", "DE", "BR", "NG", "ID", "PH", "VN", "AR", "PL", "PT", "GB"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const rows: string[] = ["contractor_id,name,email,country,role,salary_usd_monthly"];
for (let i = 1; i <= 30; i++) {
  const role = pick(ROLES);
  const salary = role === "founder" ? 12000 : role === "engineer" ? 7500 : role === "designer" ? 5500 : 4000;
  rows.push(
    `c${String(i).padStart(3, "0")},Contractor ${i},c${i}@example.com,${pick(COUNTRIES)},${role},${salary}`,
  );
}
console.log(rows.join("\n"));
