import { db } from "../db/knex";

export const logAudit = (
  userId: number | null,
  action: string,
  resource: string,
  recordId: number,
) => {
  // Ghi log ngầm (không dùng await để tránh block response của người dùng)
  db("audit_logs")
    .insert({
      user_id: userId,
      action,
      resource_name: resource,
      record_id: recordId,
    })
    .catch((err) => console.error("❌ Audit Log Error:", err));
};
