const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const exphbs = require('express-handlebars');
const _ = require('underscore');
const translate = require('google-translate-api');

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

// rooms which are currently available in chat
var rooms = {
  room1: "room1",
  room2: "room2",
  room3: "room3"
}

app.get('/', (req, res) => {
  res.send({ response: "Server is alive" }).status(200);
});

app.get('/api/:room', (req, res) => {
  const room = req.params.room;
  if (!rooms[room]) {
    return res.status(404).send("Room not found");
  } else {
    return res.status(200).send("Room found");
  }

});

io.of('/chat').on('connection', function (client) {

	client.on('adduser', function(username){
		// store the username in the socket session for this client
		client.username = username;
		// store the room name in the socket session for this client
		client.room = 'room1';
		// add the client's username to the global list
		usernames[username] = username;
		// send client to room 1
		client.join('room1');
		// echo to client they've connected
		client.emit('updatechat', 'SERVER', 'you have connected to room1');
		// echo to room 1 that a person has connected to their room
		client.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
		client.emit('updaterooms', rooms, 'room1');
	});

	client.on('sendchat', function(data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.of('/chat').in(client.room).emit('updatechat', client.username, data);
	});

	client.on('switchRoom', function(newroom){
		// leave the current room (stored in session)
		client.leave(client.room);
		// join new room, received as function parameter
		client.join(newroom);
		client.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
		// sent message to OLD room
		client.broadcast.to(client.room).emit('updatechat', 'SERVER', client.username+' has left this room');
		// update socket session room title
		client.room = newroom;
		client.broadcast.to(newroom).emit('updatechat', 'SERVER', client.username+' has joined this room');
		client.emit('updaterooms', rooms, newroom);
	});

	client.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[client.username];
		// update list of users in chat, client-side
		io.of('/chat').emit('updateusers', usernames);
		// echo globally that this client has left
		client.broadcast.emit('updatechat', 'SERVER', client.username + ' has disconnected');
		client.leave(client.room);
	});
});

server.listen(8000, () => {
  console.log('Listening on *:8000');
});
