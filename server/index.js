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

// I used this just to modify the database and include users await db.execute(`DROP TABLE messages`)

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

app.use(logger("dev"));
app.use(express.static(process.cwd() + "/client")); //You need to tell Express to load static files from the client, either way CSS won't load at all
app.use(express.json());

io.on("connection", async (socket) => {
  //socket is the client connection
  console.log("An user has connected!");

  socket.on("chat message", async (msg) => {
    let result;
    const { content, userId } = msg;
    try {
      const fecha = new Date().toISOString();
      result = await db.execute({
        sql: `INSERT INTO messages(content,fecha,user_id) VALUES (?,?,?)`,
        args: [content, fecha, userId],
      });
    } catch (error) {
      console.error(error);
      return;
    }
    io.emit("chat message", content, result.lastInsertRowid.toString()); //Server broadcast message. We're returning the last message's id to the client
  });

  if (!socket.recovered) {
    //To see if client received the most recent messages
    try {
      const results = await db.execute({
        sql: `SELECT * FROM messages where id > ?`,
        args: [socket.handshake.auth.serverOffset ?? 0], //Id that comes from client. Note that instead of socket.auth we are using socket.handshake.auth and that's because server receives it from handshake
      });

      results.rows.forEach((row) => {
        socket.emit("chat message", row.content, row.fecha, row.id.toString());
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

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await db.execute({
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

app.post("/login", async (req,res) => {
    const {email,password} = req.body;
    
})

server.listen(port, () => console.log("Server escuchando"));
