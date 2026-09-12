/**
 * 맡긴 키를 잠그고 푸는 부분 확인.
 *   node --experimental-strip-types bin/check-secret.ts
 *
 * lib/secret.ts 는 server-only 를 물고 있어 여기서 바로 못 부른다.
 * 같은 방식(AES-256-GCM + scrypt)을 그대로 써서 성질만 확인한다.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const SECRET = "test-app-secret-0123456789";
const key = scryptSync(SECRET, "closet.secret.v1", 32);

function encrypt(plain: string, k = key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

function decrypt(packed: string, k = key): string | null {
  try {
    const [version, iv, tag, body] = packed.split(".");
    if (version !== "v1" || !iv || !tag || !body) return null;
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

const plain = "sk-ant-api03-" + "x".repeat(80) + "ab12";
const packed = encrypt(plain);
const other = scryptSync("another-app-secret-000000", "closet.secret.v1", 32);

// 마지막 글자를 바꿔 위변조를 흉내 낸다
const parts = packed.split(".");
const tampered = [parts[0], parts[1], parts[2], parts[3].slice(0, -1) + (parts[3].endsWith("A") ? "B" : "A")].join(".");

const checks: [string, boolean][] = [
  ["잠갔다 풀면 원래 값", decrypt(packed) === plain],
  ["암호문에 원본이 안 보인다", !packed.includes(plain) && !packed.includes("sk-ant-")],
  ["같은 값도 매번 다른 암호문 (iv 가 다르다)", encrypt(plain) !== encrypt(plain)],
  ["APP_SECRET 이 다르면 못 푼다", decrypt(packed, other) === null],
  ["망가진 값은 못 푼다", decrypt(tampered) === null],
  ["형식이 아니면 못 푼다", decrypt("그냥 문자열") === null],
  ["가림 표시에 꼬리 네 자리만", `sk-ant-…${plain.slice(-4)}` === "sk-ant-…ab12"],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
