// Cloudinary wrapper that tries to use the real SDK if present.
// Falls back to a safe no-op implementation so the app still runs without Cloudinary installed.

type UploadCallback = (error: any, result?: { secure_url: string; public_id: string }) => void

declare const process: any

function createNoopStream(cb: UploadCallback) {
  const { Writable } = require("stream") as typeof import("stream")
  const s = new Writable({
    write(_chunk, _enc, done) {
      done()
    },
  })
  // Indicate that Cloudinary is not configured so callers can fallback to inline data URLs
  s.on("finish", () => cb(null, undefined))
  return s
}

let cloudinary: any = null
let isConfigured = false
try {
  // Dynamically require to avoid hard dependency
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { v2 } = require("cloudinary")
  const cloudName = process?.env?.CLOUDINARY_CLOUD_NAME
  const apiKey = process?.env?.CLOUDINARY_API_KEY
  const apiSecret = process?.env?.CLOUDINARY_API_SECRET
  const cloudinaryUrl = process?.env?.CLOUDINARY_URL
  if (cloudName && apiKey && apiSecret) {
    v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
    cloudinary = v2
    isConfigured = true
  } else if (cloudinaryUrl) {
    // Support Vercel setups that only provide CLOUDINARY_URL
    v2.config({ cloudinary_url: cloudinaryUrl })
    cloudinary = v2
    const cfg = v2.config()
    isConfigured = Boolean(cfg?.cloud_name && (cfg as any)?.api_key)
  }
} catch {
  // package not installed; use fallback
}

if (!cloudinary) {
  cloudinary = {
    uploader: {
      upload_stream: (_opts: any, cb: UploadCallback) => createNoopStream(cb),
    },
  }
}

export default cloudinary as any
export { isConfigured }
