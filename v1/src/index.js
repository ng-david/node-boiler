const path = require('path');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const exphbs = require('express-handlebars');
const translate = require('google-translate-api');

// Setup App
app.use(express.static(path.join(__dirname, 'public')))
// Set up views + view engine to be handlebars
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');
app.engine('handlebars', exphbs({
  layoutsDir: path.join(__dirname, 'views/layouts'),
  defaultLayout: 'main',
}));

// Run Server
http.listen(3000, () => {
  console.log('Listening on *:3000');
});

// Global Variables
let connections = 0;
let users = {};

// Initial get
app.get('/', (req, res) => {
  res.render('chat');
});

// When a user connects to app
io.on('connection', (socket) => {
  let id = getNewId();
  let name = null;

  // User Connect
  console.log(`NEW Connection (ID: ${id})`);
  socket.emit('id', id);

  // User Disconnect
  socket.on('disconnect', () => {
    if (users[id]) {
      console.log(`EHD Connection for '${users[id].name}' (ID: ${id}) with lang '${users[id].lang}'`);
      socket.broadcast.emit('login msg', `${users[id].name} left the chat. ${users[id].name} 离开聊天。`)

      delete users[id]; // Remove from database
      socket.broadcast.emit('user list', users);
      printActiveUsers();
    }
  });

  // Name Chosen
  socket.on('login', (user) => {
    let lang = user.lang;
    name = user.name;
    users[id] = { name: name, lang: lang }; // Add to database

    console.log(`${id} entered name '${name}' with lang '${lang}'`);
    socket.broadcast.emit('login msg', `${name} joined the chat. ${name} 加入聊天。`)
    io.emit('user list', users);
    printActiveUsers();
  });

  // New Chat
  socket.on('chat message', (msg) => {
    if (users[id]) {
      translate(msg, {
        from: users[id].lang,
        to: (users[id].lang === 'en' ? 'zh-CN' : 'en')
      }).then(res => {
        io.emit('chat message', {
          name: name,
          id: id,
          msg: msg,
          tMsg: res.text
        });
      }).catch(err => {
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
  console.log(`TOTAL ACTIVE: ${Object.keys(users).length}`)
}
