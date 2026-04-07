import { db } from "../db/knex";

// Hàm này query information_schema (bảng metadata của Postgres)
// để kiểm tra xem tên bảng có tồn tại không → whitelist an toàn
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await db("information_schema.tables")
    .where({
      table_schema: "public",
      table_name: tableName,
    })
    .count("table_name as count")
    .first();
  return Number(result?.count) > 0;
}

// Helper để đưa từ số nhiều về số ít (users -> user, categories -> category)
export function toSingular(str: string): string {
  if (str.endsWith("ies")) return str.replace(/ies$/, "y");
  if (str.endsWith("s") && !str.endsWith("ss")) return str.replace(/s$/, "");
  return str;
}

// Helper để đưa từ số ít về số nhiều (user -> users, category -> categories)
export function toPlural(str: string): string {
  if (str.endsWith("y") && !/[aeiou]y$/.test(str))
    return str.replace(/y$/, "ies");
  if (str.endsWith("s")) return str; // Đã là số nhiều
  return str + "s";
}
