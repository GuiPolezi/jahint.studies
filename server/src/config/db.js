// Pool de conexões MySQL/MariaDB (mysql2). As credenciais vêm do .env.
import 'dotenv/config'
import mysql from 'mysql2/promise'

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jahint_studies',
  waitForConnections: true,
  connectionLimit: 10,
  // Datas voltam como strings 'YYYY-MM-DD' / 'HH:MM:SS' — mesmo formato
  // que o frontend já usa, sem surpresas de fuso horário.
  dateStrings: true,
  charset: 'utf8mb4_unicode_ci',
})

// Atalho: query com placeholders → retorna só as linhas
export async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return rows
}
