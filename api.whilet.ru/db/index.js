import mysql_promises from "mysql2/promise";

export const poolSecurity = mysql_promises.createPool({
  port: 3306,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  database: "Security",
  password: process.env.DB_PASSWORD,
  connectionLimit: 15,
  waitForConnections: true,
  queueLimit: 100,
  connectTimeout: 10000,
});

export const poolProfile = mysql_promises.createPool({
  port: 3306,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  database: "Profile",
  password: process.env.DB_PASSWORD,
  connectionLimit: 15,
  waitForConnections: true,
  queueLimit: 100,
  connectTimeout: 10000,
});


export const poolRuSet = mysql_promises.createPool({
  port: 3306,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  database: "RuSet",
  password: process.env.DB_PASSWORD,
  connectionLimit: 15,
  waitForConnections: true,
  queueLimit: 100,
  connectTimeout: 10000,
});
