import { store, type Contractor } from "@/lib/store";

const SEED: Omit<Contractor, "id">[] = [
  { name: "Aanya Sharma",    email: "aanya@example.com",    countryCode: "IN", role: "engineer", monthlyUsd: 7500 },
  { name: "Lukas Becker",    email: "lukas@example.com",    countryCode: "DE", role: "designer", monthlyUsd: 5500 },
  { name: "Mateo Silva",     email: "mateo@example.com",    countryCode: "BR", role: "ops",      monthlyUsd: 4000 },
  { name: "Chinedu Okeke",   email: "chinedu@example.com",  countryCode: "NG", role: "engineer", monthlyUsd: 6800 },
  { name: "Rina Wijaya",     email: "rina@example.com",     countryCode: "ID", role: "ops",      monthlyUsd: 3800 },
  { name: "Carlo De Luca",   email: "carlo@example.com",    countryCode: "IT", role: "engineer", monthlyUsd: 7200 },
  { name: "Marta Nowak",     email: "marta@example.com",    countryCode: "PL", role: "designer", monthlyUsd: 4900 },
  { name: "Yuki Tanaka",     email: "yuki@example.com",     countryCode: "JP", role: "engineer", monthlyUsd: 8200 },
  { name: "Sara Costa",      email: "sara@example.com",     countryCode: "PT", role: "designer", monthlyUsd: 5100 },
  { name: "James O'Brien",   email: "james@example.com",    countryCode: "IE", role: "ops",      monthlyUsd: 4500 },
  { name: "Diego Moreno",    email: "diego@example.com",    countryCode: "AR", role: "engineer", monthlyUsd: 6500 },
  { name: "Hoang Nguyen",    email: "hoang@example.com",    countryCode: "VN", role: "engineer", monthlyUsd: 6700 },
  { name: "Lena Müller",     email: "lena@example.com",     countryCode: "DE", role: "ops",      monthlyUsd: 4200 },
  { name: "Pablo García",    email: "pablo@example.com",    countryCode: "ES", role: "designer", monthlyUsd: 5300 },
  { name: "Amaru Quispe",    email: "amaru@example.com",    countryCode: "PE", role: "engineer", monthlyUsd: 6400 },
  { name: "Sofia Andersson", email: "sofia@example.com",    countryCode: "SE", role: "designer", monthlyUsd: 5700 },
  { name: "Kemal Demir",     email: "kemal@example.com",    countryCode: "TR", role: "engineer", monthlyUsd: 6100 },
  { name: "Ji-eun Park",     email: "jieun@example.com",    countryCode: "KR", role: "designer", monthlyUsd: 5800 },
  { name: "Olu Adeyemi",     email: "olu@example.com",      countryCode: "NG", role: "ops",      monthlyUsd: 3900 },
  { name: "Ines Rocha",      email: "ines@example.com",     countryCode: "BR", role: "engineer", monthlyUsd: 6200 },
  { name: "Asha Patel",      email: "asha@example.com",     countryCode: "IN", role: "designer", monthlyUsd: 5000 },
  { name: "Fatima Khan",     email: "fatima@example.com",   countryCode: "PK", role: "engineer", monthlyUsd: 6300 },
  { name: "Tomas Holm",      email: "tomas@example.com",    countryCode: "SE", role: "ops",      monthlyUsd: 4400 },
  { name: "Mei Chen",        email: "mei@example.com",      countryCode: "TW", role: "engineer", monthlyUsd: 7000 },
  { name: "Ravi Iyer",       email: "ravi@example.com",     countryCode: "IN", role: "engineer", monthlyUsd: 7400 },
  { name: "Klara Svensson",  email: "klara@example.com",    countryCode: "SE", role: "designer", monthlyUsd: 5600 },
  { name: "Hassan Toure",    email: "hassan@example.com",   countryCode: "SN", role: "ops",      monthlyUsd: 3700 },
  { name: "Elena Popescu",   email: "elena@example.com",    countryCode: "RO", role: "designer", monthlyUsd: 4700 },
  { name: "Wei Liu",         email: "wei@example.com",      countryCode: "CN", role: "engineer", monthlyUsd: 6900 },
  { name: "Camila Ortiz",    email: "camila@example.com",   countryCode: "MX", role: "ops",      monthlyUsd: 4100 },
];

export function seedContractorsIfEmpty() {
  if (store.contractors.size > 0) return;
  SEED.forEach((c, i) => {
    const id = `c${String(i + 1).padStart(3, "0")}`;
    store.contractors.set(id, { id, ...c });
  });
}
