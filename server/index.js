import express from "express";
import dotenv from "dotenv"; //Install npm dotenv for environment variables
import logger from "morgan"; //Logger to get more info of our server
import { Server } from "socket.io";
import { createServer } from "node:http";
import { createClient } from "@libsql/client";

dotenv.config(); //Otherwise it won't work

const port = process.env.PORT ?? 3000;
const app = express();
const server = createServer(app); //We create the server thats gonna use Socket with express
const io = new Server(server); //Websocket server, uses the HTTP express server
const db = createClient({
  url: "libsql://sterling-dawnstar-oligarc.aws-eu-west-1.turso.io",
  authToken: process.env.DB_TOKEN,
});

app.use(logger("dev"));
app.use(express.static(process.cwd() + "/client")); //You need to tell Express to load static files from the client, either way CSS won't load at all
app.use(express.json());

//await db.execute(`DROP TABLE messages`) I used this just to modify the database and include users

await db.execute(`
    CREATE TABLE IF NOT EXISTS messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    fecha TEXT,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

await db.execute(`
    CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    password TEXT)`);

io.on("connection", async (socket) => {
  //socket is the client connection
  console.log("An user has connected!");

  socket.on("chat message", async (msg) => {
    let result;
    const { content, userId } = msg;
    try {
      const numericUserId = Number(msg.userId);

      if (!numericUserId || isNaN(numericUserId)) {
        console.error("Invalid userId", userId);
        return;
      }

      const userResult = await db.execute({
        sql: "SELECT name FROM users WHERE id = ?",
        args: [numericUserId],
      });

      if (!userResult.rows || userResult.rows.length === 0) {
        console.error("userId not found:", numericUserId);
        return;
      }

      const userName = userResult.rows[0].name;

      const fecha = new Date().toISOString();
      result = await db.execute({
        sql: `INSERT INTO messages(content,fecha,user_id) VALUES (?,?,?)`,
        args: [content, fecha, numericUserId],
      });

      io.emit("chat message", {
        content: msg.content,
        userName: userName,
        serverOffset: result.lastInsertRowid.toString(),
      }); //Server broadcast message. We're returning the last message's id to the client
    } catch (error) {
      console.error(error);
      return;
    }
  });

  if (!socket.recovered) {
    //To see if client received the most recent messages
    //Now we need to make a Join
    try {
      const results = await db.execute({
        sql: `
        SELECT m.content, m.fecha, m.id, u.name as userName
        FROM messages m
        JOIN users u ON m.user_id=u.id
        WHERE m.id > ?
        ORDER BY m.id ASC`,
        args: [socket.handshake.auth.serverOffset ?? 0], //Id that comes from client. Note that instead of socket.auth we are using socket.handshake.auth and that's because server receives it from handshake
      });

      results.rows.forEach((row) => {
        socket.emit("chat message", {content: row.content, userName: row.userName, fecha: row.fecha, serverOffset: row.id.toString()});
      });
    } catch (error) {
      console.error(error);
      return;
    }
  }

  socket.on("disconnect", () => {
    console.log("An user has disconnected");
  });
});

//ENDPOINTS

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await db.execute({
    //db.execute always come with rows
    sql: "SELECT id from users where email=?",
    args: [email],
  });

  if (exists.rows.length > 0) {
    return res.status(400).json({ message: "El email ya está registrado." });
  }

  const result = await db.execute({
    sql: "INSERT INTO users(name,email,password) VALUES (?,?,?)",
    args: [name, email, password],
  });

  const userId = Number(result.lastInsertRowid);

  res.json({ message: "Usuario creado correctamente.", id: userId });
});

//To create the login post

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await db.execute({
    sql: "SELECT id,password, name FROM users WHERE email=?",
    args: [email],
  });

  console.log("ESTO ES EL RESULT" + result);

  const rows = result.rows;

  if (rows.length === 0) {
    return res.status(400).json({ message: "User not found" });
  }

  const dbPassword = rows[0].password;
  const userName = rows[0].name;
  const userId = rows[0].id;

  if (dbPassword !== password) {
    return res.status(400).json({ message: "Incorrect credentials" });
  }

  res.json({ message: "Acceso correcto", name: userName, id: userId });
});

server.listen(port, () => console.log("Server escuchando"));
