/**
 * Structured Security & Audit Logger (PRD S-17)
 * Logs authentication and authorization events in structured JSON format without PII.
 * 
 * ponytail: upgrade ke winston/pino + centralized log drain saat traffic > 1k req/hari
 */

export interface SecurityLogPayload {
  event: 
    | 'auth.login_success'
    | 'auth.login_failed'
    | 'auth.logout'
    | 'auth.token_refresh'
    | 'auth.password_reset_request'
    | 'auth.password_reset_complete'
    | 'auth.rate_limit_exceeded'
    | 'rbac.access_denied';
  userId?: string | null; // Identifier or username hash — NEVER plaintext email/password/secret
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export function logSecurityEvent(payload: SecurityLogPayload) {
  // Strip any accidental sensitive fields before emitting
  const sanitizedDetails = payload.details ? { ...payload.details } : undefined;
  if (sanitizedDetails) {
    delete sanitizedDetails.password;
    delete sanitizedDetails.pass;
    delete sanitizedDetails.token;
    delete sanitizedDetails.secret;
    delete sanitizedDetails.apiKey;
    delete sanitizedDetails.email;
  }

  const logEntry = {
    level: payload.event.includes('failed') || payload.event.includes('exceeded') || payload.event.includes('denied')
      ? 'WARN'
      : 'INFO',
    event: payload.event,
    userId: payload.userId || null,
    ip: payload.ip || 'client-side',
    ua: payload.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
    details: sanitizedDetails,
    ts: payload.timestamp || new Date().toISOString(),
  };

  const jsonString = JSON.stringify(logEntry);

  if (logEntry.level === 'WARN') {
    console.warn(`[SECURITY] ${jsonString}`);
  } else {
    console.info(`[SECURITY] ${jsonString}`);
  }

  return logEntry;
}
