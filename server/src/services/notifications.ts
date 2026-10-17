import { prisma } from '../lib/prisma.js';
import { toJson, fromJson } from '../lib/json.js';
import { emitToSchool, emitToUser } from '../lib/socket.js';
import { sendPush } from './presence/channels.js';

export interface NotificationInput {
  schoolId: string;
  userId?: string;
  title: string;
  body: string;
  severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  category?: string;
  action?: unknown;
}

export async function notify(input: NotificationInput) {
  const n = await prisma.notification.create({
    data: {
      schoolId: input.schoolId,
      userId: input.userId,
      title: input.title,
      body: input.body,
      severity: input.severity ?? 'INFO',
      category: input.category ?? 'GENERAL',
      actionString: toJson(input.action ?? null),
    },
  });
  // A personal notification is emitted only to its addressee's sockets —
  // broadcasting it school-wide would leak its content (and toast it) to
  // every connected user. Only truly school-wide notices (no userId) fan out.
  if (input.userId) emitToUser(input.userId, 'notification:new', serializeNotification(n));
  else emitToSchool(input.schoolId, 'notification:new', serializeNotification(n));
  // An external provider failure must not roll back the already delivered in-app notice.
  try { await sendPush({schoolId:input.schoolId,to:input.userId??'*',title:input.title,body:input.body,notificationId:n.id,critical:input.severity==='CRITICAL'}); }
  catch { console.error('Push dispatch failed; in-app notification is preserved.'); }
  return n;
}

/**
 * `read` is per-viewer (computed from NotificationRead receipts), so the
 * caller supplies it. The default covers freshly-created notifications going
 * out over the socket — new mail is unread for everybody by definition.
 */
export function serializeNotification(n: any, read = false) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    severity: n.severity,
    category: n.category,
    action: fromJson(n.actionString, null),
    read,
    createdAt: n.createdAt,
  };
}
