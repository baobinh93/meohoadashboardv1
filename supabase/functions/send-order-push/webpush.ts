
/**
 * Zero-dependency Web Push (RFC 8030) client built on WebCrypto.
 *
 * Encrypts messages with aes128gcm (RFC 8291, RFC 8188) and authenticates
 * with VAPID (RFC 8292). VAPID keys are JWK.
 */

const textEncoder = new TextEncoder()

const KEY_INFO = textEncoder.encode('WebPush: info\0')
const CEK_INFO = textEncoder.encode('Content-Encoding: aes128gcm\0')
const NONCE_INFO = textEncoder.encode('Content-Encoding: nonce\0')

const MAX_RECORD_SIZE = 4096
const MIN_OVERHEAD = 103
const JWT_TTL = 12 * 60 * 60

export const URGENCIES = ['very-low', 'low', 'normal', 'high'] as const

export type Urgency = (typeof URGENCIES)[number]

export interface Subscription {
  endpoint: string
  keys: {
    auth: string
    p256dh: string
  }
}

export interface SendOptions {
  vapid: JsonWebKey | string
  subscriber: string
  ttl: number
  topic?: string
  urgency?: Urgency
  recordSize?: number
  vapidExpiration?: Date
}

interface Deps {
  fetch?: typeof fetch
  keyPair?: CryptoKeyPair
  salt?: Uint8Array
}

export interface EncryptedRequest {
  body: Uint8Array<ArrayBuffer>
  headers: Record<string, string>
  endpoint: string
}

export interface PushError extends Error {
  statusCode: number
  body: string
  endpointHost: string
  permanent: boolean
  location: string
}

// Decode standard Base64 or Base64URL, with or without padding.
function b64decode(input: string): Uint8Array<ArrayBuffer> {
  const normalized = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/\s/g, '')

  const padded = normalized + '='.repeat(
    (4 - (normalized.length % 4)) % 4,
  )

  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

// Encode bytes as Base64URL without padding.
function b64urlEncode(bytes: Uint8Array): string {
  let binary = ''

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(
    parts.reduce((n, part) => n + part.length, 0),
  )

  let offset = 0

  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }

  return out
}

interface VapidKeyMaterial {
  key: CryptoKey
  publicKey: string
}

const vapidKeyCache = new WeakMap<
  JsonWebKey,
  Promise<VapidKeyMaterial>
>()

const vapidKeyStringCache = new Map<
  string,
  Promise<VapidKeyMaterial>
>()

function vapidKeyMaterial(
  vapid: JsonWebKey | string,
): Promise<VapidKeyMaterial> {
  if (typeof vapid === 'string') {
    let material = vapidKeyStringCache.get(vapid)

    if (!material) {
      material = importVapidKey(
        JSON.parse(vapid) as JsonWebKey,
      )

      vapidKeyStringCache.set(vapid, material)
    }

    return material
  }

  let material = vapidKeyCache.get(vapid)

  if (!material) {
    material = importVapidKey(vapid)
    vapidKeyCache.set(vapid, material)
  }

  return material
}

async function importVapidKey(
  jwk: JsonWebKey,
): Promise<VapidKeyMaterial> {
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  return {
    key,
    publicKey: b64urlEncode(
      concat(
        new Uint8Array([4]),
        b64decode(jwk.x ?? ''),
        b64decode(jwk.y ?? ''),
      ),
    ),
  }
}

export async function generateVapidKey(): Promise<JsonWebKey> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  )

  return await crypto.subtle.exportKey(
    'jwk',
    pair.privateKey,
  )
}

export async function vapidPublicKey(
  vapid: JsonWebKey | string,
): Promise<string> {
  return (await vapidKeyMaterial(vapid)).publicKey
}

function b64urlJson(value: unknown): string {
  return b64urlEncode(
    textEncoder.encode(JSON.stringify(value)),
  )
}

async function signJwt(
  key: CryptoKey,
  claims: Record<string, unknown>,
): Promise<string> {
  const unsigned = `${b64urlJson({
    typ: 'JWT',
    alg: 'ES256',
  })}.${b64urlJson(claims)}`

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      textEncoder.encode(unsigned),
    ),
  )

  if (sig.length !== 64) {
    throw new Error(`unexpected ECDSA sig: ${sig.length}`)
  }

  return `${unsigned}.${b64urlEncode(sig)}`
}

async function authHeader(
  endpoint: string,
  subscriber: string,
  vapid: JsonWebKey | string,
  expiration: Date,
): Promise<string> {
  let url: URL

  try {
    url = new URL(endpoint)
  } catch {
    throw new Error(`invalid endpoint: ${endpoint}`)
  }

  if (!url.protocol || !url.hostname) {
    throw new Error(`invalid endpoint: ${endpoint}`)
  }

  if (
    !subscriber.startsWith('https:') &&
    !subscriber.startsWith('mailto:')
  ) {
    throw new Error(`invalid subscriber: ${subscriber}`)
  }

  const { key, publicKey } = await vapidKeyMaterial(vapid)

  const jwt = await signJwt(key, {
    aud: url.origin,
    exp: Math.floor(expiration.getTime() / 1000),
    sub: subscriber,
  })

  return `vapid t=${jwt}, k=${publicKey}`
}

// Message encryption (RFC 8188 aes128gcm)
async function encryptRecord(
  uaPublic: Uint8Array<ArrayBuffer>,
  authSecret: Uint8Array<ArrayBuffer>,
  message: Uint8Array,
  recordSize: number,
  keyPair: CryptoKeyPair,
  salt: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const subtle = crypto.subtle

  const uaKey = await subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )

  const sharedSecret = await subtle.deriveBits(
    { name: 'ECDH', public: uaKey },
    keyPair.privateKey,
    256,
  )

  const ecdhKey = await subtle.importKey(
    'raw',
    sharedSecret,
    'HKDF',
    false,
    ['deriveBits', 'deriveKey'],
  )

  const appPublic = new Uint8Array(
    await subtle.exportKey('raw', keyPair.publicKey),
  )

  const ikm = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authSecret,
      info: concat(KEY_INFO, uaPublic, appPublic),
    },
    ecdhKey,
    256,
  )

  const ikmKey = await subtle.importKey(
    'raw',
    ikm,
    'HKDF',
    false,
    ['deriveBits', 'deriveKey'],
  )

  const cek = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: CEK_INFO,
    },
    ikmKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt'],
  )

  const nonce = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: NONCE_INFO,
    },
    ikmKey,
    96,
  )

  const plaintext = concat(
    message,
    new Uint8Array([2]),
  )

  const ciphertext = new Uint8Array(
    await subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      cek,
      plaintext,
    ),
  )

  const header = new Uint8Array(86)

  header.set(salt, 0)
  new DataView(header.buffer).setUint32(
    16,
    recordSize,
    false,
  )

  header[20] = appPublic.length
  header.set(appPublic, 21)

  return concat(header, ciphertext)
}

export async function encrypt(
  subscription: Subscription,
  message: string | Uint8Array,
  options: SendOptions,
  deps: Deps = {},
): Promise<EncryptedRequest> {
  const { endpoint, keys } = subscription

  if (!endpoint || !keys.auth || !keys.p256dh) {
    throw new Error(
      'invalid subscription, missing endpoint or keys',
    )
  }

  const authSecret = b64decode(keys.auth)

  if (authSecret.length !== 16) {
    throw new Error(
      'invalid auth secret, expected 16 bytes',
    )
  }

  const uaPublic = b64decode(keys.p256dh)

  const recordSize = options.recordSize || MAX_RECORD_SIZE

  const messageBytes = typeof message === 'string'
    ? textEncoder.encode(message)
    : message

  if (messageBytes.length > recordSize - MIN_OVERHEAD) {
    throw new Error(
      `message length of ${messageBytes.length} is too long for record size of ${recordSize}`,
    )
  }

  if (!Number.isFinite(options.ttl)) {
    throw new Error('ttl is required')
  }

  if (
    options.urgency &&
    !URGENCIES.includes(options.urgency)
  ) {
    throw new Error(`invalid urgency: ${options.urgency}`)
  }

  const keyPair = deps.keyPair
    ?? await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    )

  const salt = (
    deps.salt ?? crypto.getRandomValues(new Uint8Array(16))
  ) as Uint8Array<ArrayBuffer>

  const expiration = options.vapidExpiration
    ?? new Date(Date.now() + JWT_TTL * 1000)

  const authorization = await authHeader(
    endpoint,
    options.subscriber,
    options.vapid,
    expiration,
  )

  const headers: Record<string, string> = {
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(Math.trunc(options.ttl)),
    Authorization: authorization,
  }

  if (options.topic) headers.Topic = options.topic
  if (options.urgency) headers.Urgency = options.urgency

  const body = await encryptRecord(
    uaPublic,
    authSecret,
    messageBytes,
    recordSize,
    keyPair,
    salt,
  )

  return { body, headers, endpoint }
}

export async function send(
  subscription: Subscription,
  message: string | Uint8Array,
  options: SendOptions,
  deps: Deps = {},
): Promise<void> {
  const { body, headers, endpoint } = await encrypt(
    subscription,
    message,
    options,
    deps,
  )

  const response = await (deps.fetch ?? fetch)(endpoint, {
    method: 'POST',
    headers,
    body,
  })

  if (response.status >= 200 && response.status < 300) {
    return
  }

  throw await pushError(endpoint, response)
}

async function pushError(
  endpoint: string,
  response: Response,
): Promise<PushError> {
  const body = await response.text()

  let message = `error from push endpoint with status=${response.status}`

  if (body.startsWith('{')) {
    try {
      const json = JSON.parse(body)
      message = json.message ?? json.reason ?? message
    } catch {
      // keep the default message
    }
  } else if (
    response.headers.get('content-type')?.startsWith('text/plain')
  ) {
    message = body.trim()
  }

  return Object.assign(new Error(message), {
    statusCode: response.status,
    body,
    endpointHost: new URL(endpoint).hostname,
    permanent: response.status === 404 || response.status === 410,
    location: response.headers.get('location') ?? '',
  })
}
