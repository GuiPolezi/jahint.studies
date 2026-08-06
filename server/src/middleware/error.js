// Tratamento central de erros: HttpError vira resposta com o status certo;
// o resto vira 500 genérico (detalhe só no log do servidor).
import { HttpError } from '../lib/validate.js'

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message })
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Registro duplicado.' })
  }
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande (limite: 25MB).' : 'Falha no upload do arquivo.'
    return res.status(400).json({ error: msg })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
}

// Envolve handlers async para que exceções caiam no errorHandler
export const asyncH = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
