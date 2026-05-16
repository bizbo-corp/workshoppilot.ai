import 'dotenv/config';
import { db } from '../src/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  // Find recent stakeholder-mapping greetings (assistant role) across all sessions,
  // grouped by scope, with row count. Any scope with count > 1 is a duplicate.
  console.log('STAKEHOLDER-MAPPING ASSISTANT ROWS in the last hour, grouped by scope:');
  const dups = await db.execute(sql`
    SELECT session_id, participant_id, COUNT(*) AS n,
           MIN(created_at) AS first_at, MAX(created_at) AS last_at
    FROM chat_messages
    WHERE step_id = 'stakeholder-mapping'
      AND role = 'assistant'
      AND created_at > now() - interval '2 hours'
    GROUP BY session_id, participant_id
    HAVING COUNT(*) > 1
    ORDER BY last_at DESC
  `);
  for (const r of dups.rows) console.log(' ', r);

  if (dups.rows.length === 0) {
    console.log('  (no duplicates found in last 2h)');
  }

  // Also dump all assistant rows for the most recently active stakeholder-mapping scope
  console.log('\nMost recent assistant messages (any scope) — last 10:');
  const recent = await db.execute(sql`
    SELECT id, session_id, participant_id, message_id, LEFT(content, 80) AS head, created_at
    FROM chat_messages
    WHERE step_id = 'stakeholder-mapping' AND role = 'assistant'
    ORDER BY created_at DESC LIMIT 10
  `);
  for (const r of recent.rows) console.log(' ', r);

  // Cross-check chat_request_logs for the most recent stakeholder-mapping scope
  if (recent.rows.length > 0) {
    const sid = (recent.rows[0] as { session_id: string }).session_id;
    console.log(`\nchat_request_logs for stakeholder-mapping in session ${sid}:`);
    const logs = await db.execute(sql`
      SELECT id, participant_id, response_message_id, is_replay, request_id, created_at
      FROM chat_request_logs
      WHERE session_id = ${sid} AND step_id = 'stakeholder-mapping'
      ORDER BY created_at ASC
    `);
    for (const r of logs.rows) console.log(' ', r);
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
