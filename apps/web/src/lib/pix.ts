// Builds a static Pix "copia e cola" payload (BR Code, the EMVCo-based format every
// bank app scans) so the deposit screen can show a real, scannable QR code — not
// just the bare key as text. Pure data transform: no network, no state.

interface PixPayloadInput {
  pixKey: string
  beneficiaryName: string
  beneficiaryCity: string
  amountCents: number
}

function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`
}

// Strips accents/diacritics and anything outside A-Z0-9 space — Pix requires
// plain ASCII uppercase for the merchant name/city fields.
function sanitize(value: string, maxLength: number): string {
  const plain = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
  return (plain || 'NA').slice(0, maxLength)
}

// CRC16/CCITT-FALSE: init 0xFFFF, poly 0x1021, no reflect, no final xor — the
// checksum the Pix spec mandates for the payload's last field (63).
function crc16(payload: string): string {
  let crc = 0xffff
  for (let index = 0; index < payload.length; index++) {
    crc ^= payload.charCodeAt(index) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Builds the full BR Code string to encode in the QR (amount fixed, no reusable txid). */
export function buildPixPayload({
  pixKey,
  beneficiaryName,
  beneficiaryCity,
  amountCents,
}: PixPayloadInput): string {
  const merchantAccountInfo = tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey))
  const additionalData = tlv('62', tlv('05', '***')) // no dynamic txid to reconcile by

  const payloadWithoutCrc =
    tlv('00', '01') +
    merchantAccountInfo +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', (amountCents / 100).toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', sanitize(beneficiaryName, 25)) +
    tlv('60', sanitize(beneficiaryCity, 15)) +
    additionalData +
    '6304'

  return payloadWithoutCrc + crc16(payloadWithoutCrc)
}
