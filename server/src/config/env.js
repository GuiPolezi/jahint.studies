// Leitura obrigatória de variáveis de ambiente. A API não sobe com valor
// ausente ou vazio — antes, DB_USER/DB_PASSWORD caíam em root/sem senha.
import 'dotenv/config'

export function requireEnv(name) {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    console.error(`ERRO: defina ${name} no arquivo .env (veja .env.example).`)
    process.exit(1)
  }
  return value
}
