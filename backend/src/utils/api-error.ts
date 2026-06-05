/**
 * Standard API error envelope for دروب Droob.
 *
 * Every API response uses one of two shapes:
 *   Success: { success: true, data: T }
 *   Error:   { success: false, error: { code, message_ar, message_en, details? } }
 */

import type { FastifyReply } from "fastify";

// ──── Response types ────

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message_ar: string;
    message_en: string;
    details?: unknown;
  };
}

export interface ApiSuccessBody<T = unknown> {
  success: true;
  data: T;
}

// ──── Helpers ────

/**
 * Send a standardised error response.
 */
export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  messageAr: string,
  messageEn: string,
  details?: unknown,
): void {
  const body: ApiErrorBody = {
    success: false,
    error: { code, message_ar: messageAr, message_en: messageEn },
  };
  if (details !== undefined) body.error.details = details;

  reply.status(status).send(body);
}

/**
 * Send a standardised success response.
 * Default status is 200 when data is provided, 201 when called without data.
 */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  status?: number,
): void {
  reply.status(status ?? 200).send({ success: true, data } as ApiSuccessBody<T>);
}

/**
 * Convenience: send a 400 validation-error response using Zod errors.
 */
export function sendValidationError(reply: FastifyReply, errors: unknown): void {
  sendError(reply, 400, "ValidationError", "بيانات غير صالحة", "Invalid data", errors);
}

/**
 * Convenience: send a 404 not-found response.
 */
export function sendNotFound(reply: FastifyReply, labelAr = "المورد", labelEn = "Resource"): void {
  sendError(reply, 404, "NotFound", `${labelAr} غير موجود`, `${labelEn} not found`);
}
