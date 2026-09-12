import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * 사용자가 맡긴 값(지금은 Anthropic API 키)을 DB에 넣기 전에 잠그는 부분.
 *
 * DB만 새어 나가도 키가 그대로 털리면 안 되므로, 서버만 아는 APP_SECRET 으로
 * 잠가서 넣는다. 둘 다 새면 소용없지만, 한쪽만 새는 사고가 훨씬 흔하다.
 *
 * AES-256-GCM 이라 복호화할 때 위변조도 같이 걸러진다.
 */

const VERSION = "v1";
/** scrypt 는 느리다. 요청마다 다시 뽑지 않게 한 번만 만든다 */
let cachedKey: Buffer | null = null;

export function hasAppSecret() {
  return typeof process.env.APP_SECRET === "string" && process.env.APP_SECRET.length >= 16;
}

function key() {
  if (cachedKey) return cachedKey;
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("APP_SECRET 이 없습니다 (16자 이상).");
  }
  // salt 를 고정으로 두면 같은 APP_SECRET 에서 늘 같은 키가 나온다.
  // 값마다 다른 iv 를 쓰므로 암호문은 매번 달라진다.
  cachedKey = scryptSync(secret, "closet.secret.v1", 32);
  return cachedKey;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(
    ".",
  );
}

/** 못 풀면 null. APP_SECRET 을 바꿨거나 값이 망가진 경우다 */
export function decryptSecret(packed: string): string | null {
  try {
    const [version, iv, tag, body] = packed.split(".");
    if (version !== VERSION || !iv || !tag || !body) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(body, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** 화면에 보여줄 가림 표시. 키 자체는 브라우저로 절대 안 보낸다 */
export function maskSecret(plain: string): string {
  const tail = plain.slice(-4);
  return `sk-ant-…${tail}`;
}
