
import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "./webpush.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const WEBHOOK_SECRET = Deno.env.get("ORDER_PUSH_WEBHOOK_SECRET")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

if (
  !SUPABASE_URL ||
  !SERVICE_ROLE_KEY ||
  !WEBHOOK_SECRET ||
  !VAPID_PUBLIC_KEY ||
  !VAPID_PRIVATE_KEY ||
  !VAPID_SUBJECT
) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Convert Base64URL to bytes
function base64UrlToBytes(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/") + padding;

  const binary = atob(base64);

  return Uint8Array.from(
    binary,
    (char) => char.charCodeAt(0),
  );
}

// Convert bytes to Base64URL
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

// Convert VAPID keys to private JWK
function convertVapidKeysToJWK(
  publicKey: string,
  privateKey: string,
): JsonWebKey {
  const publicBytes = base64UrlToBytes(publicKey);
  const privateBytes = base64UrlToBytes(privateKey);

  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error("Invalid VAPID public key");
  }

  if (privateBytes.length !== 32) {
    throw new Error("Invalid VAPID private key");
  }

  const x = bytesToBase64Url(publicBytes.slice(1, 33));
  const y = bytesToBase64Url(publicBytes.slice(33, 65));
  const d = bytesToBase64Url(privateBytes);

  return {
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    x,
    y,
    d,
    key_ops: ["sign"],
    ext: true,
  };
}

const vapidPrivateKey = convertVapidKeysToJWK(
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405 },
    );
  }

  // Verify webhook secret
  const receivedSecret = req.headers.get("x-webhook-secret");

  if (!receivedSecret || receivedSecret !== WEBHOOK_SECRET) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let claimedOrderId: string | null = null;
  let sent = 0;
  let failed = 0;

  try {
    const payload = await req.json();

    // Only accept INSERT events from public.orders
    if (
      payload.type !== "INSERT" ||
      payload.table !== "orders" ||
      payload.schema !== "public" ||
      !payload.record?.id
    ) {
      return Response.json({
        success: true,
        skipped: true,
      });
    }

    const orderId = payload.record.id;

    // Atomically claim this order to prevent duplicate processing
    const { error: claimError } = await supabase
      .from("order_push_logs")
      .insert({ order_id: orderId });

    if (claimError?.code === "23505") {
      return Response.json({
        success: true,
        duplicate: true,
        message: "Order already processed",
      });
    }

    if (claimError) throw claimError;

    claimedOrderId = orderId;

    // Find active Admin accounts only
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true);

    if (adminError) throw adminError;

    if (!admins?.length) {
      return Response.json({
        success: true,
        sent: 0,
        message: "No active admins",
      });
    }

    const adminIds = admins.map((admin) => admin.id);

    // Find registered devices belonging to active Admins
    const { data: subscriptions, error: subscriptionError } =
      await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .in("user_id", adminIds);

    if (subscriptionError) throw subscriptionError;

    if (!subscriptions?.length) {
      return Response.json({
        success: true,
        sent: 0,
        message: "No registered devices",
      });
    }

    // Notification intentionally contains no order information
    const notification = JSON.stringify({
      title: "Mèo Hoa Admin",
      body: "Bạn có đơn hàng mới",
      url: "/dashboard",
    });

    for (const subscription of subscriptions) {
      try {
        await webpush.send(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notification,
          {
            vapid: vapidPrivateKey,
            subscriber: VAPID_SUBJECT,
            ttl: 60,
          },
        );

        sent++;
      } catch (error) {
        failed++;

        const isPermanentError =
          typeof error === "object" &&
          error !== null &&
          "permanent" in error &&
          error.permanent === true;

        if (isPermanentError) {
          const { error: deleteError } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);

          if (deleteError) {
            console.error(
              "Failed to remove expired subscription:",
              deleteError.message,
            );
          }
        } else {
          console.error(
            "Push delivery failed:",
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      }
    }

    // Save sending results
    const { error: logError } = await supabase
      .from("order_push_logs")
      .update({
        sent_count: sent,
        failed_count: failed,
      })
      .eq("order_id", orderId);

    if (logError) throw logError;

    return Response.json({
      success: true,
      sent,
      failed,
    });
  } catch (error) {
    console.error(
      "Send order push error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    if (claimedOrderId) {
      await supabase
        .from("order_push_logs")
        .update({
          sent_count: sent,
          failed_count: Math.max(failed, 1),
        })
        .eq("order_id", claimedOrderId);
    }

    return Response.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
});
