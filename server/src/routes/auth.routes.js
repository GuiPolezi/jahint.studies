import { Router } from 'express'
import { asyncH } from '../middleware/error.js'
import { requireAuth } from '../middleware/auth.js'
import { avatarUpload } from '../config/uploads.js'
import * as Auth from '../controllers/auth.controller.js'

const r = Router()

// Públicas
r.post('/auth/register', asyncH(Auth.register))
r.post('/auth/login', asyncH(Auth.login))

// Autenticadas
r.get('/me', requireAuth, asyncH(Auth.me))
r.put('/me', requireAuth, asyncH(Auth.updateMe))
r.post('/me/avatar', requireAuth, avatarUpload.single('avatar'), asyncH(Auth.updateAvatar))
r.put('/me/active-semester', requireAuth, asyncH(Auth.setActiveSemester))
r.get('/me/data', requireAuth, asyncH(Auth.bootstrap))

export default r
