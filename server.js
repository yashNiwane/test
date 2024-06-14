const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(__dirname));

let waitingUsers = [];

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  // Add the new user to the waiting queue
  waitingUsers.push(socket.id);

  // If there are at least two users in the queue, match them
  if (waitingUsers.length >= 2) {
    const user1 = waitingUsers.shift();
    const user2 = waitingUsers.shift();

    console.log('Matching users:', user1, user2);

    io.to(user1).emit('match-found', user2);
    io.to(user2).emit('match-found', user1);
  }

  socket.on('offer', (offer, targetSocketId) => {
    io.to(targetSocketId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, targetSocketId) => {
    io.to(targetSocketId).emit('answer', answer);
  });

  socket.on('ice-candidate', (iceCandidate, targetSocketId) => {
    io.to(targetSocketId).emit('ice-candidate', iceCandidate);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    waitingUsers = waitingUsers.filter(id => id !== socket.id);
  });
});

const port = process.env.PORT || 3030;
server.listen(port, () => console.log(`Server running on port ${port}`));