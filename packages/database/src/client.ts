import mysql from "mysql2/promise";
import { appConfig } from "@sistem-klinik/config";

const { database } = appConfig

const config: any = {
  host: process.env.MYSQL_HOST ?? database.host,
  port: Number(process.env.MYSQL_PORT ?? database.port),
  user: process.env.MYSQL_USER ?? database.user,
  password: process.env.MYSQL_PASSWORD ?? database.password,
  database: process.env.MYSQL_DATABASE ?? database.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
  // Nilai kolom DATE adalah tanggal kalender klinik, bukan timestamp UTC.
  // Mengembalikannya sebagai string mencegah tanggal bergeser satu hari.
  dateStrings: ["DATE"],
}

if (database.socket) config.socketPath = database.socket

const pool = mysql.createPool(config)

export default pool
