import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import {
  amountToPaise,
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from "../services/razorpay.service";
import { cleanupExpiredReservations } from "../services/marketplace.service";
import { broadcastMarketplaceOrderEvent } from "../websocket/marketplace.socket";

function bufferFromBody(body: unknown) {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === "string") return Buffer.from(body);
  throw new Error("Webhook body is not raw");
}

// ============================================================
// CREATE ONLINE RAZORPAY ORDER
// POST /api/user/marketplace/orders/:orderId/payment/create
// ============================================================
export async function createOnlinePayment(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Authentication required" });
    const { orderId } = req.params;

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: orderId, buyerId: req.userId },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod !== "ONLINE") return res.status(400).json({ message: "This order is not an online payment order" });
    if (order.status !== "PENDING_PAYMENT") return res.status(409).json({ message: "Order is not waiting for payment" });
    if (order.paymentStatus !== "PENDING") return res.status(409).json({ message: "Payment is no longer pending" });
    if (order.reservationExpiresAt && order.reservationExpiresAt < new Date()) {
      await cleanupExpiredReservations();
      return res.status(409).json({ message: "Payment reservation expired. Please place the order again." });
    }

    if (order.razorpayOrderId) {
      const existingPayment = await prisma.marketplacePayment.findFirst({
        where: {
          orderId: order.id,
          providerOrderId: order.razorpayOrderId,
          kind: "CHECKOUT",
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        message: "Payment order already created",
        razorpay: {
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: order.razorpayOrderId,
          amount: amountToPaise(Number(order.totalAmount)),
          currency: "INR",
        },
        paymentId: existingPayment?.id ?? null,
      });
    }

    const razorpayOrder = await createRazorpayOrder({
      amountPaise: amountToPaise(Number(order.totalAmount)),
      receipt: order.orderNumber,
      notes: {
        marketplaceOrderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    const payment = await prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceOrder.updateMany({
        where: {
          id: order.id,
          buyerId: req.userId!,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          razorpayOrderId: null,
        },
        data: {
          razorpayOrderId: razorpayOrder.id,
        },
      });

      if (updated.count !== 1) {
        throw new Error("PAYMENT_ORDER_ALREADY_CREATED");
      }

      return tx.marketplacePayment.create({
        data: {
          orderId: order.id,
          userId: req.userId!,
          kind: "CHECKOUT",
          status: "PENDING",
          amount: order.totalAmount,
          currency: "INR",
          provider: "RAZORPAY",
          providerOrderId: razorpayOrder.id,
          metadata: {
            receipt: order.orderNumber,
          },
        },
      });
    });

    return res.status(201).json({
      message: "Razorpay order created",
      paymentId: payment.id,
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    });
  } catch (error) {
    console.error("createOnlinePayment:", error);
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create payment" });
  }
}

// ============================================================
// VERIFY STANDARD RAZORPAY CHECKOUT
// POST /api/user/marketplace/orders/:orderId/payment/verify
// ============================================================
export async function verifyOnlinePayment(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: "Authentication required" });
    const { orderId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};

    if (
      ![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(
        (value) => typeof value === "string" && value.length > 0,
      )
    ) {
      return res.status(400).json({ message: "Razorpay verification data is incomplete" });
    }

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: orderId, buyerId: req.userId },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.razorpayOrderId !== razorpay_order_id) return res.status(400).json({ message: "Razorpay order mismatch" });

    const validSignature = verifyRazorpayCheckoutSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!validSignature) return res.status(400).json({ message: "Invalid Razorpay signature" });

    const paymentFromProvider = await fetchRazorpayPayment(razorpay_payment_id);

    if (paymentFromProvider.order_id !== razorpay_order_id) {
      return res.status(400).json({ message: "Razorpay payment/order mismatch" });
    }

    if (paymentFromProvider.status !== "captured") {
      return res.status(400).json({ message: `Payment is not captured (${paymentFromProvider.status})` });
    }

    if (paymentFromProvider.amount !== amountToPaise(Number(order.totalAmount))) {
      return res.status(400).json({ message: "Paid amount does not match order amount" });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.marketplacePayment.findFirst({
        where: {
          orderId: order.id,
          kind: "CHECKOUT",
          providerOrderId: razorpay_order_id,
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingPayment) {
        await tx.marketplacePayment.update({
          where: { id: existingPayment.id },
          data: {
            status: "PAID",
            providerPaymentId: razorpay_payment_id,
            providerSignature: razorpay_signature,
            collectedAt: new Date(),
          },
        });
      } else {
        await tx.marketplacePayment.create({
          data: {
            orderId: order.id,
            userId: req.userId!,
            kind: "CHECKOUT",
            status: "PAID",
            amount: order.totalAmount,
            currency: "INR",
            provider: "RAZORPAY",
            providerOrderId: razorpay_order_id,
            providerPaymentId: razorpay_payment_id,
            providerSignature: razorpay_signature,
            collectedAt: new Date(),
          },
        });
      }

      return tx.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "PLACED",
          reservationExpiresAt: null,
        },
      });
    });

    broadcastMarketplaceOrderEvent(order.id, {
      type: "order:payment",
      orderId: order.id,
      paymentStatus: "PAID",
      orderStatus: updatedOrder.status,
    });

    return res.json({
      message: "Payment verified and order confirmed",
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    });
  } catch (error) {
    console.error("verifyOnlinePayment:", error);
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to verify payment" });
  }
}

// ============================================================
// RAZORPAY WEBHOOK
// Public route. Must receive express.raw({type:"application/json"}).
// Handles payment.captured / payment.failed / order.paid and
// payment-link payment events.
// ============================================================
export async function razorpayWebhook(req: Request, res: Response) {
  try {
    const rawBody = bufferFromBody(req.body);
    const signature = req.headers["x-razorpay-signature"];

    if (typeof signature !== "string") {
      return res.status(400).json({ message: "Missing Razorpay webhook signature" });
    }

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    const event = String(payload?.event || "");

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        const order = await prisma.marketplaceOrder.findFirst({
          where: { razorpayOrderId: orderId },
        });

        if (order) {
          const expectedPaise = amountToPaise(Number(order.totalAmount));
          const webhookAmount = Number(paymentEntity.amount);

          if (webhookAmount === expectedPaise) {
            await prisma.$transaction(async (tx) => {
              const existingPayment = await tx.marketplacePayment.findFirst({
                where: {
                  orderId: order.id,
                  OR: [
                    { providerPaymentId: paymentId },
                    { providerOrderId: orderId, kind: "CHECKOUT" },
                  ],
                },
                orderBy: { createdAt: "desc" },
              });

              if (existingPayment) {
                await tx.marketplacePayment.update({
                  where: { id: existingPayment.id },
                  data: {
                    status: "PAID",
                    providerPaymentId: paymentId,
                    collectedAt: new Date(),
                  },
                });
              } else {
                await tx.marketplacePayment.create({
                  data: {
                    orderId: order.id,
                    userId: order.buyerId,
                    kind: "CHECKOUT",
                    status: "PAID",
                    amount: order.totalAmount,
                    currency: "INR",
                    provider: "RAZORPAY",
                    providerOrderId: orderId,
                    providerPaymentId: paymentId,
                    collectedAt: new Date(),
                  },
                });
              }

              if (order.paymentStatus !== "PAID") {
                await tx.marketplaceOrder.update({
                  where: { id: order.id },
                  data: {
                    paymentStatus: "PAID",
                    status: order.status === "PENDING_PAYMENT" ? "PLACED" : order.status,
                    reservationExpiresAt: null,
                  },
                });
              }
            });
          }
        }
      }
    }

    if (event === "payment.failed") {
      const paymentEntity = payload?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const order = await prisma.marketplaceOrder.findFirst({ where: { razorpayOrderId: orderId } });
        if (order && order.paymentStatus !== "PAID") {
          await prisma.$transaction(async (tx) => {
            const existingPayment = await tx.marketplacePayment.findFirst({
              where: { orderId: order.id, providerOrderId: orderId, kind: "CHECKOUT" },
              orderBy: { createdAt: "desc" },
            });

            if (existingPayment) {
              await tx.marketplacePayment.update({
                where: { id: existingPayment.id },
                data: {
                  status: "FAILED",
                  providerPaymentId: paymentId || existingPayment.providerPaymentId,
                  metadata: paymentEntity?.error_description
                    ? { error: paymentEntity.error_description }
                    : existingPayment.metadata,
                },
              });
            }
          });
        }
      }
    }

    // Doorstep UPI Payment Link events. Payment Links are intended for
    // link-based collection and can also be rendered as a QR by the app.
    if (event === "payment_link.paid") {
      const linkEntity = payload?.payload?.payment_link?.entity;
      const paymentEntity = payload?.payload?.payment?.entity;
      const providerLinkId = linkEntity?.id;
      const providerPaymentId = paymentEntity?.id;

      if (providerLinkId) {
        const payment = await prisma.marketplacePayment.findFirst({
          where: { providerLinkId, kind: "DOORSTEP_UPI" },
          orderBy: { createdAt: "desc" },
        });

        if (payment) {
          const order = await prisma.marketplaceOrder.findUnique({ where: { id: payment.orderId } });
          if (order) {
            await prisma.$transaction(async (tx) => {
              await tx.marketplacePayment.update({
                where: { id: payment.id },
                data: {
                  status: "PAID",
                  providerPaymentId: providerPaymentId || payment.providerPaymentId,
                  collectedAt: new Date(),
                  metadata: payload?.payload ?? payment.metadata,
                },
              });

              await tx.marketplaceOrder.update({
                where: { id: order.id },
                data: {
                  paymentStatus: "PAID",
                  ...(order.status === "REACHED"
                    ? { status: "COMPLETED", completedAt: new Date() }
                    : {}),
                },
              });
            });
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("razorpayWebhook:", error);
    return res.status(400).json({ message: "Webhook processing failed" });
  }
}
