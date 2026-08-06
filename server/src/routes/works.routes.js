import { Router } from 'express'
import { asyncH } from '../middleware/error.js'
import { attachmentUpload } from '../config/uploads.js'
import * as Works from '../controllers/works.controller.js'

const r = Router()

r.get('/works', asyncH(Works.list))
r.post('/works', asyncH(Works.create))
r.get('/works/:id', asyncH(Works.getOne))
r.put('/works/:id', asyncH(Works.update))
r.delete('/works/:id', asyncH(Works.remove))

// Integrantes do grupo
r.post('/works/:id/members', asyncH(Works.addMember))
r.delete('/works/:id/members/:memberId', asyncH(Works.removeMember))

// Abas de anotação
r.post('/works/:id/tabs', asyncH(Works.addTab))
r.get('/work-tabs/:id/content', asyncH(Works.getTabContent))
r.put('/work-tabs/:id', asyncH(Works.updateTab))
r.delete('/work-tabs/:id', asyncH(Works.removeTab))

// Anexos (arquivo no disco, caminho no banco)
r.post('/works/:id/attachments', attachmentUpload.single('file'), asyncH(Works.addAttachment))
r.get('/attachments/:id/download', asyncH(Works.downloadAttachment))
r.delete('/attachments/:id', asyncH(Works.removeAttachment))

export default r
