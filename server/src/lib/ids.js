// Ids de 24 caracteres, seguros para URL — mesmo tamanho do CHAR(24) do schema.
import crypto from 'node:crypto'

export const uid = () => crypto.randomBytes(18).toString('base64url')
