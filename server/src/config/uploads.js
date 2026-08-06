// Configuração do multer: avatares e anexos vão para pastas separadas
// dentro de UPLOAD_DIR. No banco fica só o caminho do arquivo.
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { uid } from '../lib/ids.js'

export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars')
const WORKS_DIR = path.join(UPLOAD_DIR, 'works')

for (const dir of [AVATAR_DIR, WORKS_DIR]) fs.mkdirSync(dir, { recursive: true })

const storageIn = dir => multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    // Nome aleatório + extensão original — nunca confiar no nome enviado
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.\w-]/g, '')
    cb(null, `${uid()}${ext}`)
  },
})

export const avatarUpload = multer({
  storage: storageIn(AVATAR_DIR),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) =>
    file.mimetype?.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('O avatar deve ser uma imagem.')),
})

export const attachmentUpload = multer({
  storage: storageIn(WORKS_DIR),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB por arquivo
})
