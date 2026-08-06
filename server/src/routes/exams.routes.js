import { Router } from 'express'
import { asyncH } from '../middleware/error.js'
import * as Exams from '../controllers/exams.controller.js'

const r = Router()

r.get('/exams', asyncH(Exams.list))
r.post('/exams', asyncH(Exams.create))
r.put('/exams/:id', asyncH(Exams.update))
r.delete('/exams/:id', asyncH(Exams.remove))

export default r
