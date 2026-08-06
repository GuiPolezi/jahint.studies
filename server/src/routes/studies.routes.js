import { Router } from 'express'
import { asyncH } from '../middleware/error.js'
import * as Studies from '../controllers/studies.controller.js'

const r = Router()

// Anos letivos
r.get('/years', asyncH(Studies.listYears))
r.post('/years', asyncH(Studies.createYear))
r.put('/years/:id', asyncH(Studies.updateYear))
r.delete('/years/:id', asyncH(Studies.deleteYear))

// Semestres
r.post('/years/:yearId/semesters', asyncH(Studies.createSemester))
r.delete('/semesters/:id', asyncH(Studies.deleteSemester))

// Aulas (com horários embutidos)
r.post('/semesters/:semesterId/classes', asyncH(Studies.createClass))
r.put('/classes/:id', asyncH(Studies.updateClass))
r.delete('/classes/:id', asyncH(Studies.deleteClass))

export default r
