import { Router } from 'express'
import { asyncH } from '../middleware/error.js'
import { noteAttachmentUpload } from '../config/uploads.js'
import * as Notes from '../controllers/notes.controller.js'

const r = Router()

r.get('/classes/:classId/notes', asyncH(Notes.listByClass))
r.post('/classes/:classId/notes', asyncH(Notes.create))
r.get('/notes/:id', asyncH(Notes.getOne))       // inclui o conteúdo TipTap
r.put('/notes/:id', asyncH(Notes.update))       // título, data e/ou conteúdo
r.delete('/notes/:id', asyncH(Notes.remove))

// Anexos da anotação (arquivo no disco, caminho no banco).
// Namespace próprio: os ids de note_attachments e work_attachments vivem em
// tabelas diferentes e não devem cair na mesma rota /attachments/:id.
r.post('/notes/:id/attachments', noteAttachmentUpload.single('file'), asyncH(Notes.addAttachment))
r.get('/note-attachments/:id/download', asyncH(Notes.downloadAttachment))
r.delete('/note-attachments/:id', asyncH(Notes.removeAttachment))

export default r
