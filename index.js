const express = require('express');
const app = express();
const PORT = 4000;

const http = require('http')
const cors = require('cors');

app.use(cors())

const server = http.createServer(app)

// SocketIO Section
const { Server } = require('socket.io');
const { emit } = require('process');

const socketIO = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

socketIO.use((socket, next) => {

    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
        // Find Existing session
        const session = sessionStorage.findSession(sessionID);

        if (session) {
            socket.sessionID = sessionID;
            socket.userID = session.userID;
            socket.username = session.userName
            return next();
        }
    }

    const username = socket.handshake.auth.userName
    
    if (!username) {
        console.log(next(new Error("invalid username")))
        return next(new Error("invalid username"))
    }

    // Create new session
    socket.sessionID = socket.id
    socket.userName = username;
    console.log(socket.userName)
    next();
})

// Socket.io main heart
socketIO.on('connection', (socket) => {
    // All users active
    let users = [];

    for (let [id, socket] of socketIO.of("/").sockets) {
        users.push({
            userID: id,
            userName: socket.userName
        })
    }
    socket.emit("users", users)
    socket.emit("session", {
        sessionID: socket.sessionID,
        userID: socket.userID
    })

    // Display when user connected
    console.log(`⚡: ${socket.id} user just connected!`)
    console.log(users)

    // When user send message (recieve from client)
    socket.on('message', (data) => {
        // Send the respond to client
        socketIO.emit('messageRes', data)
    })

    // When new user sign up (recieve from client)
    socket.on('newUser', (data) => {
        // Add the new user to the list
        users.push(data)

        // Sends latest list to client
        socketIO.emit('newUserRes', users)
    })

    // When user typing a text (recieve from client)
    socket.on('typing', (data) => {
        // Send the respond to client
        socket.broadcast.emit('typingRes', data)
    })

    // Display when user disconnected
    socket.on('disconnect', () => {
        console.log(`🔥: A user disconnected`)

        // Delete the disconnect users
        users = users.filter((user) => user.socketID !== socket.id)

        // Send latest list to client
        socketIO.emit('newUserRes', users)
        socket.disconnect()
    })
})

app.get('/api', (req, res) => {
    res.json({
        message: 'Hello world',
    });
});

server.listen(PORT, () => {
    console.log("Server had started on PORT " + PORT)
})