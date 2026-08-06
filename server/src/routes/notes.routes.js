import { Router } from 'express'
import { asyncH } from '../middleware/error.js'
import * as Notes from '../controllers/notes.controller.js'

const r = Router()

r.get('/classes/:classId/notes', asyncH(Notes.listByClass))
r.post('/classes/:classId/notes', asyncH(Notes.create))
r.get('/notes/:id', asyncH(Notes.getOne))       // inclui o conteúdo TipTap
r.put('/notes/:id', asyncH(Notes.update))       // título, data e/ou conteúdo
r.delete('/notes/:id', asyncH(Notes.remove))

export default r
