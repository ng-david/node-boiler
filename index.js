const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const exphbs = require('express-handlebars');
const _ = require('underscore');
const translate = require('google-translate-api');
const fs = require('fs');
const path = require("path");

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use('/public', express.static('public'));

// Enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Read available rooms from local rooms.json file
// This will have the latest backup of the available rooms
const roomsFile = 'rooms.json';
const rawdata = fs.readFileSync(path.join(__dirname, roomsFile));
const rooms = JSON.parse(rawdata);

// Initial GET
// app.get('/', function(req, res) {
//   res.render('home');
// });
//
// app.get('/chat', function(req, res) {
//   res.render('chat');
// });

// usernames which are currently connected to the chat
var usernames = {};

//
// var rooms = {
//   room1: {
//     users: ['room1 GOD'],
//     langs: ['en', 'en'],
//     password: ''
//   },
//   room2: {
//     users: [],
//     langs: ['en', 'en'],
//     password: ''
//   },
//   room3: {
//     users: [],
//     langs: ['en', 'en'],
//     password: ''
//   }
// }

app.get('/', (req, res) => {
  res.send({ response: "Server is alive" }).status(200);
});

app.get('/api/:room', (req, res) => {
  const room = req.params.room;
  // Ensure given room is a string
  if ((typeof room === 'string' || room instanceof String) && rooms[room]) {
    return res.status(200).send("Room found");
  } else {
    return res.status(404).send("Room not found");
  }
});

app.post('/api/create', (req, res) => {
  const room = req.body.room;
  const date = new Date(req.body.date);
  try {
    // Add five hours to date
    console.log("------------" + typeof date);
    const expireDate = new Date (date.setMinutes(date.getMinutes() + 2));
    rooms[room] = {
      users: [],
      langs: ['en', 'en'],
      password: '',
      expireDate: expireDate.toLocaleString()
    }

    // Delete this room when the timeout expires for this room,
    // Then backup to file
    setTimeout(() => {
      delete rooms[room];
      backupToRoomsFile(() => {}); // no need for callback, just async update file
    }, 60000);

    // Backup room to file
    backupToRoomsFile(() => {
      return res.status(200).send("Room created");
    });
  } catch(err) {
    console.log("ERROR: " + err);
    return res.status(500).send("Server failed to make");
  }
})

io.of('/chat').on('connection', function (client) {

	client.on('adduser', function(username, room){
    if (username !== null && room !== null) {
      console.log(`[SOCKET.IO]: New user ${username} connected to room ${room}`);

      // store data in socket session for this client
      client.username = username;
      client.room = room;

      // add the client's username to the room
      rooms[room].users.push(username);

      // send client to specified room
      client.join(room);
      // echo to client they've connected
      client.emit('updatechat', 'SERVER', `you have connected to ${room}`, 'time not shared for now');

      // TODO tells clients when this room will expire
      if (rooms[room].expireDate) {
        client.emit('updatechat', 'SERVER', `This room will expire at ${rooms[room].expireDate}`, 'time not shared for now');
      }

      // echo to room that a person has connected to their room
      client.broadcast.to(room).emit('updatechat', 'SERVER', username + ' has connected to this room', 'time not shared for now');
      // Update rooms
      client.emit('updaterooms', room);
      // Update users
      io.of('/chat').in(client.room).emit('updateusers', rooms[client.room].users);
    }
	});

	client.on('sendchat', function(msg, time) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.of('/chat').in(client.room).emit('updatechat', client.username, msg, time);
	});

	// client.on('switchRoom', function(newroom){
	// 	// leave the current room (stored in session)
	// 	client.leave(client.room);
	// 	// join new room, received as function parameter
	// 	client.join(newroom);
	// 	client.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
	// 	// sent message to OLD room
	// 	client.broadcast.to(client.room).emit('updatechat', 'SERVER', client.username+' has left this room');
	// 	// update socket session room title
	// 	client.room = newroom;
	// 	client.broadcast.to(newroom).emit('updatechat', 'SERVER', client.username+' has joined this room');
	// 	client.emit('updaterooms', rooms, newroom);
	// });

	client.on('disconnect', function(){
    if (client.room && client.username) {
      // remove the username from room's users list
      const currentRoomUsers = rooms[client.room].users;
      currentRoomUsers.splice(currentRoomUsers.indexOf(client.username), 1);

      // If no more users in room, kill it
      // TODO make this countdown five minutes!
      if (currentRoomUsers.length === 0) {
        delete rooms[client.room];
        backupToRoomsFile(() => {}); // no need for callback, just async update file
      // If still users in room
      } else {
        // update list of users in chat, client-side
        io.of('/chat').in(client.room).emit('updateusers', currentRoomUsers);
        // echo to room that this client has left
        io.of('/chat').in(client.room).emit('updatechat', 'SERVER', client.username + ' has disconnected');
        client.leave(client.room);
      }
    }
	});
});

// Backup rooms to file
function backupToRoomsFile(callback) {
  fs.writeFile(roomsFile, JSON.stringify(rooms), 'utf8', callback);
}

server.listen(8000, () => {
  console.log('Listening on *:8000');
});
