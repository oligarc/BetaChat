# BetaChat
Just a beta chat I'm developing to implement in another big project

## Protocol, technologies and dependencies used

The project is using Web Sockets as protocol to communicate in real time.

The technologies used are:

- **Node.js**: Used to develop the server-side.
- **Express**: Framework from Node.js to develop the endpoints.
- **HTML, CSS and Vanilla JS**: To develop the user design and the web behaviour.
- **TursoDB**: A free DB hosting that I found and seemed to me very useful.
- **Render**: To deploy the app.

Talking about dependencies we have:

- **Dotenv**: To read and use environment variables.
- **Morgan**: Useful dev tool to see more information about your endpoints.
- **Socket.io**: Crutial. Communication is based on this.
- **@libsql/client**: To create the client and DB.

## How it works

This is working as a chat group. You can think of it as Whatsapp's groups, Telegram's, Teams' or Discord's. You won't be able (yet) to talk in private with another user, this is mainly thought to work this way. As you can imagine I'll work to have this shortly-term talking.

## Try it

You can already try it [here](https://betachat-aid6.onrender.com)

Please note this a **very first beta design** and need more development.
