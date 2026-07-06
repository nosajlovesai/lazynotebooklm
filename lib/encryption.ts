import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-me'

export function encryptCredential(credential: string): string {
  return CryptoJS.AES.encrypt(credential, ENCRYPTION_KEY).toString()
}

export function decryptCredential(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}
