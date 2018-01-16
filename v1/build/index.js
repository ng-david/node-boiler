'use strict';

var path = require('path');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var exphbs = require('express-handlebars');
var translate = require('google-translate-api');

// Setup App
app.use(express.static(path.join(__dirname, 'public')));
// Set up views + view engine to be handlebars
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');
app.engine('handlebars', exphbs({
  layoutsDir: path.join(__dirname, 'views/layouts'),
  defaultLayout: 'main'
}));

// Run Server
http.listen(3000, function () {
  console.log('Listening on *:3000');
});

// Global Variables
var connections = 0;
var users = {};

// Initial get
app.get('/', function (req, res) {
  res.render('chat');
});

// When a user connects to app
io.on('connection', function (socket) {
  var id = getNewId();
  var name = null;

  // User Connect
  console.log('NEW Connection (ID: ' + id + ')');
  socket.emit('id', id);

  // User Disconnect
  socket.on('disconnect', function () {
    if (users[id]) {
      console.log('EHD Connection for \'' + users[id].name + '\' (ID: ' + id + ') with lang \'' + users[id].lang + '\'');
      socket.broadcast.emit('login msg', users[id].name + ' left the chat. ' + users[id].name + ' \u79BB\u5F00\u804A\u5929\u3002');

      delete users[id]; // Remove from database
      socket.broadcast.emit('user list', users);
      printActiveUsers();
    }
  });

  // Name Chosen
  socket.on('login', function (user) {
    var lang = user.lang;
    name = user.name;
    users[id] = { name: name, lang: lang }; // Add to database

    console.log(id + ' entered name \'' + name + '\' with lang \'' + lang + '\'');
    socket.broadcast.emit('login msg', name + ' joined the chat. ' + name + ' \u52A0\u5165\u804A\u5929\u3002');
    io.emit('user list', users);
    printActiveUsers();
  });

  // New Chat
  socket.on('chat message', function (msg) {
    if (users[id]) {
      translate(msg, {
        from: users[id].lang,
        to: users[id].lang === 'en' ? 'zh-CN' : 'en'
      }).then(function (res) {
        io.emit('chat message', {
          name: name,
          id: id,
          msg: msg,
          tMsg: res.text
        });
      }).catch(function (err) {
        console.error(err);
      });
    }
  });
});

// Helper functions
function getNewId() {
  return ++connections;
}

function printActiveUsers() {
  console.log('TOTAL ACTIVE: ' + Object.keys(users).length);
}