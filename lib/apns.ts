import "server-only";
import http2 from "node:http2";

const APNS_HOST = "https://api.push.apple.com";

// Sends an empty-payload "your pass changed" push to each device, using
// certificate-based auth with the Pass Type ID cert (the same cert that signs
// passes). Best-effort: logs failures, never throws.
export async function sendApplePassPush(pushTokens: string[]): Promise<void> {
  const tokens = pushTokens.filter(Boolean);
  if (!tokens.length) return;

  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const certB64 = process.env.APPLE_SIGNER_CERT;
  const keyB64 = process.env.APPLE_SIGNER_KEY;
  if (!passTypeId || !certB64 || !keyB64) return;

  const cert = Buffer.from(certB64, "base64");
  const key = Buffer.from(keyB64, "base64");

  let client: http2.ClientHttp2Session;
  try {
    client = http2.connect(APNS_HOST, { cert, key });
  } catch (e) {
    console.error("[apns] connect failed:", e instanceof Error ? e.message : e);
    return;
  }
  client.on("error", (e) => console.error("[apns] session error:", e.message));

  await Promise.all(
    tokens.map(
      (token) =>
        new Promise<void>((resolve) => {
          const req = client.request({
            ":method": "POST",
            ":path": `/3/device/${token}`,
            "apns-topic": passTypeId,
            // Required by modern APNs; pass updates are silent background pushes
            // (empty payload), which must use priority 5.
            "apns-push-type": "background",
            "apns-priority": "5",
          });
          let status = 0;
          let body = "";
          req.setEncoding("utf8");
          req.on("response", (h) => (status = Number(h[":status"])));
          req.on("data", (d) => (body += d));
          req.on("end", () => {
            if (status !== 200) console.error(`[apns] ${token.slice(0, 10)}… -> ${status} ${body}`);
            resolve();
          });
          req.on("error", (e) => {
            console.error("[apns] request error:", e.message);
            resolve();
          });
          req.end("{}");
        })
    )
  );

  client.close();
}
