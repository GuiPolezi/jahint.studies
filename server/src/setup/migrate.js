// Cria o banco (se não existir) e todas as tabelas do schema.sql.
// Uso: npm run db:setup
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'jahint_studies',
} = process.env

async function main() {
  // Conecta sem selecionar banco para poder criá-lo
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  })

  console.log(`→ Garantindo banco "${DB_NAME}"…`)
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
     DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await conn.changeUser({ database: DB_NAME })

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

  // Remove linhas de comentário e executa statement por statement,
  // para dar mensagens de erro claras.
  // O ALTER TABLE da FK de active_semester_id falha se já existir — ignorado.
  const statements = sql
    .split(/\r?\n/)
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)

  for (const stmt of statements) {
    try {
      await conn.query(stmt)
    } catch (err) {
      const isDuplicateFk =
        stmt.startsWith('ALTER TABLE') &&
        ['ER_FK_DUP_NAME', 'ER_DUP_KEY', 'ER_DUP_KEYNAME', 'ER_CANT_CREATE_TABLE'].includes(err.code)
      if (isDuplicateFk) continue // já aplicado em execução anterior
      console.error('\nFalha no statement:\n', stmt.slice(0, 200), '\n')
      throw err
    }
  }

  console.log('✓ Tabelas criadas/atualizadas com sucesso.')
  await conn.end()
}

main().catch(err => {
  console.error('Erro na migração:', err.message)
  process.exit(1)
})
