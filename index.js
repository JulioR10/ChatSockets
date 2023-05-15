const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const multer = require("multer");
const path = require("path");

const upload = multer({ dest: "public/uploads/" });

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (req.file.mimetype.startsWith("image/")) {
    console.log(req.file);
    res.status(200).send({ fileName: req.file.filename });
  } else {
    res.status(400).send("Not an image!");
  }
});

const users = {};

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join room", (roomId, username) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    socket.emit("room joined", roomId);
    users[socket.id] = username;

    io.to(roomId).emit("chat message", {
      username: "System",
      message: `${username} has joined the room.`,
    });
  });

  socket.on("chat message", (message) => {
    io.to(socket.roomId).emit("chat message", {
      username: socket.username,
      message: message,
    });
  });

  socket.on("private message", (recipientUsername, message) => {
    const recipientSocketId = Object.keys(users).find(
      (key) => users[key] === recipientUsername
    );
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("private message", {
        username: socket.username,
        message: message,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    if (socket.roomId && socket.username) {
      io.to(socket.roomId).emit("chat message", {
        username: "System",
        message: `${socket.username} has left the room.`,
      });
    }
    delete users[socket.id];
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});
