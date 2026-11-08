import mysql from "mysql2/promise";

// Pool de conexiones a MySQL mediante mysql2
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  // Devuelve DATE y DATETIME como texto para evitar corrimientos de zona horaria
  dateStrings: true,
});

export async function probarConexion() {
  const conexion = await db.getConnection();
  conexion.release();
}
