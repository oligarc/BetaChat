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
const io = new Server(server);
const db = createClient({
    url:"libsql://sterling-dawnstar-oligarc.aws-eu-west-1.turso.io",
    authToken:process.env.DB_TOKEN
})

app.use(logger("dev"));
app.use(express.static(process.cwd() + "/client")); //You need to tell Express to load static files from the client, either way CSS won't load at all

io.on("connection", (socket) => {
  console.log("An user has connected!");

  socket.on('chat message', (msg) => {
        io.emit('chat message', msg) //Server broadcast message
    })

  socket.on("disconnect", () => {
    console.log("An user has disconnected");
  });
});

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

server.listen(port, () => console.log("Server escuchando"));
