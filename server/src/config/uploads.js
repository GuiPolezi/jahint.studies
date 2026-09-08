// Configuração do multer: avatares e anexos vão para pastas separadas
// dentro de UPLOAD_DIR. No banco fica só o caminho do arquivo.
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { fileTypeFromFile } from 'file-type'
import { uid } from '../lib/ids.js'
import { HttpError } from '../lib/validate.js'

export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars')
const WORKS_DIR = path.join(UPLOAD_DIR, 'works')
const NOTES_DIR = path.join(UPLOAD_DIR, 'notes')

// Limite por arquivo de anexo (trabalhos e anotações). Um único lugar para o
// número e para a mensagem de erro em middleware/error.js.
export const MAX_ATTACHMENT_MB = 25
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024
const MAX_AVATAR_BYTES = 3 * 1024 * 1024

for (const dir of [AVATAR_DIR, WORKS_DIR, NOTES_DIR]) fs.mkdirSync(dir, { recursive: true })

// O multipart entrega o nome do arquivo em latin1: "relatório.pdf" chega
// como "relatÃ³rio.pdf". Reinterpreta em UTF-8, mantendo o original se a
// conversão não resultar em texto válido.
export function decodeFileName(name) {
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('�') ? name : decoded
}

const storageIn = dir => multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    // Nome aleatório + extensão original saneada (só letras e dígitos, até
    // 5 caracteres) — nunca confiar no nome enviado
    const ext = path.extname(file.originalname).slice(1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)
    cb(null, ext ? `${uid()}.${ext}` : uid())
  },
})

// Avatares são servidos publicamente por express.static, então só entram
// formatos que o navegador exibe como imagem — nada de .html/.svg, que seriam
// renderizados como página na origem da API. A extensão final vem do tipo
// detectado nos bytes (assertRealImage), não do nome nem do mimetype.
const AVATAR_TYPES = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
])

export const avatarUpload = multer({
  storage: storageIn(AVATAR_DIR),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  // Primeira barreira (o mimetype vem do cliente); a real é assertRealImage
  fileFilter: (req, file, cb) =>
    AVATAR_TYPES.has(file.mimetype)
      ? cb(null, true)
      : cb(new HttpError(400, 'O avatar deve ser uma imagem PNG, JPG, WEBP ou GIF.')),
})

// Confere os bytes reais do arquivo já gravado pelo multer. Devolve o caminho
// final (renomeado com a extensão do tipo detectado) ou null — e, nesse caso,
// já apagou o arquivo do disco.
export async function assertRealImage(filePath) {
  const detected = await fileTypeFromFile(filePath).catch(() => null)
  const ext = detected ? AVATAR_TYPES.get(detected.mime) : null
  if (!ext) {
    await fs.promises.unlink(filePath).catch(() => {})
    return null
  }
  const safePath = filePath.replace(/\.[^./\\]*$/, '') + ext
  if (safePath !== filePath) await fs.promises.rename(filePath, safePath)
  return safePath
}

export const attachmentUpload = multer({
  storage: storageIn(WORKS_DIR),
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
})

// Anexos de anotação de aula (slides, PDFs, .ova, códigos...). Pasta separada
// da de trabalhos para o disco continuar legível, mesmo limite por arquivo.
export const noteAttachmentUpload = multer({
  storage: storageIn(NOTES_DIR),
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
})
