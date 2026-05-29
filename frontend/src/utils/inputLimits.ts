// Centralized maximum character lengths for user-editable form fields.
//
// These are enforced client-side through the native `maxLength` attribute as a
// first line of defense and UX guard, and mirrored by the server-side
// validators in `backend/src/validators/auth.validators.ts`, which remain the
// authoritative cap. Bounding input length protects against oversized payloads
// and abusive input regardless of what the client sends.
export const INPUT_LIMITS = {
  email: 254, // RFC 5321 maximum address length
  password: 128, // generous passphrase room (bcrypt only consumes the first 72 bytes)
  cnpj: 18, // formatted: 00.000.000/0000-00
  cpf: 14, // formatted: 000.000.000-00
  cep: 9, // formatted: 00000-000
  companyName: 120,
  corporateName: 120,
  contactPerson: 120,
  contactTitle: 80,
  address: 200,
  street: 120,
  number: 10,
  complement: 80,
  neighborhood: 80,
  city: 80,
  state: 40,
  phone: 20,
  website: 200,
} as const;
