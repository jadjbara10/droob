/**
 * دروب E-Payment Integration Service
 * Supports Jordanian payment gateways:
 *   - eFAWATEERcom (via API)
 *   - Zain Cash (mobile wallet)
 *   - Future: Dinarak, Orange Money, JoMoPay
 *
 * Flow:
 *   1. Create Payment (item details → gateway)
 *   2. Verify Payment (callback/webhook verification)
 *   3. Wallet Management (prepaid wallet balance)
 *   4. Transaction History
 */

import { db } from "../db/index.js";
import { payments, tickets, walletTransactions } from "../../drizzle/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────
export type PaymentGateway = "efawateercom" | "zain_cash" | "dinarak" | "orange_money" | "jomopay";

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled";

export type PaymentMethod = "wallet" | "card" | "mobile_money";

export interface CreatePaymentInput {
  userId: string;
  amount: number; // in JOD
  currency?: string; // default: JOD
  gateway: PaymentGateway;
  method: PaymentMethod;
  description?: string;
  metadata?: Record<string, string>;
  items?: Array<{
    type: "ticket" | "topup" | "subscription";
    ticketId?: string;
    quantity?: number;
    price: number;
    description: string;
  }>;
}

export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  gatewayReference?: string;
  redirectUrl?: string; // For web-based payment flows
  deepLink?: string;    // For mobile app payment flows
  qrCode?: string;      // For Zain Cash QR payments
}

// ─── Constants ────────────────────────────────────────────────
const GATEWAY_CONFIG: Record<PaymentGateway, {
  name_ar: string;
  name_en: string;
  apiUrl?: string;
  merchantId?: string;
}> = {
  efawateercom: {
    name_ar: "إي فواتيركم",
    name_en: "eFAWATEERcom",
    apiUrl: "https://api.efawateercom.jo",
    merchantId: process.env.EFAWATEERCOM_MERCHANT_ID,
  },
  zain_cash: {
    name_ar: "زين كاش",
    name_en: "Zain Cash",
    apiUrl: "https://api.zaincash.iq",
    merchantId: process.env.ZAIN_CASH_MERCHANT_ID,
  },
  dinarak: {
    name_ar: "دينارك",
    name_en: "Dinarak",
    apiUrl: "https://api.dinarak.jo",
    merchantId: process.env.DINARAK_MERCHANT_ID,
  },
  orange_money: {
    name_ar: "أورنج موني",
    name_en: "Orange Money",
    apiUrl: "https://api.orange.jo/money",
    merchantId: process.env.ORANGE_MONEY_MERCHANT_ID,
  },
  jomopay: {
    name_ar: "جو موباي",
    name_en: "JoMoPay",
    apiUrl: "https://api.jomopay.jo",
    merchantId: process.env.JOMOPAY_MERCHANT_ID,
  },
};

// ─── eFAWATEERcom Integration ─────────────────────────────────
async function createEfawateercomPayment(
  paymentId: string,
  amount: number,
  description: string
): Promise<PaymentResult> {
  const merchantId = GATEWAY_CONFIG.efawateercom.merchantId;
  const apiKey = process.env.EFAWATEERCOM_API_KEY;
  const apiUrl = GATEWAY_CONFIG.efawateercom.apiUrl;

  if (!merchantId || !apiKey || !apiUrl) {
    throw new Error("eFAWATEERcom configuration missing");
  }

  try {
    const response = await fetch(`${apiUrl}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Merchant-Id": merchantId,
      },
      body: JSON.stringify({
        merchantReference: paymentId,
        amount: amount.toFixed(3),
        currency: "JOD",
        description: description,
        callbackUrl: `${process.env.API_BASE_URL}/api/v1/payments/efawateercom/callback`,
        returnUrl: `${process.env.API_BASE_URL}/payment/result`,
      }),
    });

    const data = (await response.json()) as {
      success: boolean;
      paymentUrl?: string;
      gatewayReference?: string;
      qrCode?: string;
      error?: string;
    };

    if (data.success) {
      return {
        paymentId,
        status: "pending",
        gatewayReference: data.gatewayReference,
        redirectUrl: data.paymentUrl,
        qrCode: data.qrCode,
      };
    } else {
      throw new Error(data.error || "eFAWATEERcom payment creation failed");
    }
  } catch (error) {
    console.error("eFAWATEERcom error:", error);
    return { paymentId, status: "failed" };
  }
}

// ─── Zain Cash Integration ────────────────────────────────────
async function createZainCashPayment(
  paymentId: string,
  amount: number,
  description: string,
  phoneNumber?: string
): Promise<PaymentResult> {
  const merchantId = GATEWAY_CONFIG.zain_cash.merchantId;
  const apiKey = process.env.ZAIN_CASH_API_KEY;
  const apiUrl = GATEWAY_CONFIG.zain_cash.apiUrl;

  if (!merchantId || !apiKey || !apiUrl) {
    throw new Error("Zain Cash configuration missing");
  }

  try {
    const response = await fetch(`${apiUrl}/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Merchant-Id": merchantId,
      },
      body: JSON.stringify({
        merchantReference: paymentId,
        amount: amount.toFixed(3),
        currency: "JOD",
        description: description,
        phoneNumber: phoneNumber,
        callbackUrl: `${process.env.API_BASE_URL}/api/v1/payments/zaincash/callback`,
        redirectUrl: `droob://payment/result`,
      }),
    });

    const data = (await response.json()) as {
      success: boolean;
      transactionId?: string;
      deepLink?: string;
      error?: string;
    };

    if (data.success) {
      return {
        paymentId,
        status: "pending",
        gatewayReference: data.transactionId,
        deepLink: data.deepLink,
      };
    } else {
      throw new Error(data.error || "Zain Cash payment creation failed");
    }
  } catch (error) {
    console.error("Zain Cash error:", error);
    return { paymentId, status: "failed" };
  }
}

// ─── Main Payment Creation ────────────────────────────────────
export async function createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
  const paymentId = randomUUID();
  const totalAmount = input.items
    ? input.items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
    : input.amount;

  const description =
    input.description ||
    input.items?.map((i) => `${i.description} x${i.quantity || 1}`).join(", ") ||
    "Payment";

  // Insert payment record
  await db.insert(payments).values({
    id: paymentId,
    userId: input.userId,
    amount: totalAmount.toString(),
    currency: input.currency || "JOD",
    gateway: input.gateway,
    method: input.method,
    status: "pending",
    description: description,
    metadata: input.metadata || {},
    items: input.items || [],
  });

  // Route to gateway
  let result: PaymentResult;
  switch (input.gateway) {
    case "efawateercom":
      result = await createEfawateercomPayment(paymentId, totalAmount, description);
      break;
    case "zain_cash":
      result = await createZainCashPayment(paymentId, totalAmount, description);
      break;
    default:
      // For other gateways, return mock for now
      result = {
        paymentId,
        status: "pending",
        redirectUrl: `${process.env.API_BASE_URL}/payment/${input.gateway}/${paymentId}`,
      };
  }

  // Update payment with gateway reference
  if (result.gatewayReference) {
    await db
      .update(payments)
      .set({
        gatewayReference: result.gatewayReference,
        status: result.status,
      })
      .where(eq(payments.id, paymentId));
  }

  return result;
}

// ─── Payment Verification ─────────────────────────────────────
export async function verifyPayment(
  paymentId: string,
  gatewayResponse: Record<string, unknown>
): Promise<{ success: boolean; status: PaymentStatus }> {
  const payment = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment.length) {
    throw new Error("Payment not found");
  }

  const p = payment[0];
  let verified = false;

  // Verify with the appropriate gateway
  switch (p.gateway as PaymentGateway) {
    case "efawateercom":
      verified = await verifyEfawateercomPayment(
        p.gatewayReference || "",
        gatewayResponse
      );
      break;
    case "zain_cash":
      verified = await verifyZainCashPayment(
        p.gatewayReference || "",
        gatewayResponse
      );
      break;
    default:
      verified = gatewayResponse.status === "success";
  }

  const newStatus: PaymentStatus = verified ? "completed" : "failed";

  await db
    .update(payments)
    .set({
      status: newStatus,
      gatewayResponse: gatewayResponse,
      completedAt: verified ? sql`NOW()` : undefined,
    })
    .where(eq(payments.id, paymentId));

  // If completed, process the items (create tickets, top-up wallet, etc.)
  if (verified && p.items) {
    await processPaymentItems(paymentId, p.userId, p.items as Array<{
      type: string;
      ticketId?: string;
      quantity?: number;
      price: number;
      description: string;
    }>);
  }

  return { success: verified, status: newStatus };
}

async function verifyEfawateercomPayment(
  gatewayRef: string,
  response: Record<string, unknown>
): Promise<boolean> {
  // eFAWATEERcom sends a callback with signed payload
  // Verify the signature using the API key
  const apiKey = process.env.EFAWATEERCOM_API_KEY;
  if (!apiKey) return false;

  try {
    const verifyUrl = `${GATEWAY_CONFIG.efawateercom.apiUrl}/v1/payments/${gatewayRef}/verify`;
    const verifyResponse = await fetch(verifyUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = (await verifyResponse.json()) as { status: string };
    return data.status === "completed" || data.status === "success";
  } catch {
    return false;
  }
}

async function verifyZainCashPayment(
  gatewayRef: string,
  response: Record<string, unknown>
): Promise<boolean> {
  const apiKey = process.env.ZAIN_CASH_API_KEY;
  if (!apiKey) return false;

  try {
    const verifyUrl = `${GATEWAY_CONFIG.zain_cash.apiUrl}/v1/transactions/${gatewayRef}/verify`;
    const verifyResponse = await fetch(verifyUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = (await verifyResponse.json()) as { status: string };
    return data.status === "completed" || data.status === "success";
  } catch {
    return false;
  }
}

async function processPaymentItems(
  paymentId: string,
  userId: string,
  items: Array<{
    type: string;
    ticketId?: string;
    quantity?: number;
    price: number;
    description: string;
  }>
): Promise<void> {
  for (const item of items) {
    switch (item.type) {
      case "ticket":
        // Create ticket for user
        if (item.ticketId) {
          await db.insert(tickets).values({
            id: randomUUID(),
            userId: userId,
            paymentId: paymentId,
            ticketType: "single",
            status: "active",
            price: item.price.toString(),
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h validity
            quantity: item.quantity || 1,
          });
        }
        break;

      case "topup":
        // Top-up wallet balance
        const existing = await db
          .select()
          .from(walletTransactions)
          .where(eq(walletTransactions.userId, userId))
          .orderBy(desc(walletTransactions.createdAt))
          .limit(1);

        const previousBalance = existing.length > 0
          ? parseFloat(existing[0].balanceAfter || "0")
          : 0;

        await db.insert(walletTransactions).values({
          id: randomUUID(),
          userId: userId,
          type: "topup",
          amount: item.price.toString(),
          balanceBefore: previousBalance.toString(),
          balanceAfter: (previousBalance + item.price).toString(),
          paymentId: paymentId,
          description: item.description,
        });
        break;

      case "subscription":
        // Monthly pass, etc.
        await db.insert(tickets).values({
          id: randomUUID(),
          userId: userId,
          paymentId: paymentId,
          ticketType: "subscription",
          status: "active",
          price: item.price.toString(),
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          quantity: item.quantity || 1,
        });
        break;
    }
  }
}

// ─── Wallet Management ────────────────────────────────────────
export async function getWalletBalance(userId: string): Promise<number> {
  const transactions = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(1);

  if (!transactions.length) return 0;
  return parseFloat(transactions[0].balanceAfter || "0");
}

export async function getTransactionHistory(
  userId: string,
  limit = 50,
  offset = 0
): Promise<Array<Record<string, unknown>>> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getActiveTickets(userId: string): Promise<Array<Record<string, unknown>>> {
  return db
    .select()
    .from(tickets)
    .where(
      sql`${tickets.userId} = ${userId} AND ${tickets.status} = 'active' AND ${tickets.validUntil} > NOW()`
    )
    .orderBy(desc(tickets.createdAt));
}

export { GATEWAY_CONFIG };