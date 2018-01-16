// Main
$(function() {
  if (window.navigator.standalone) {
    console.log("FJSKEMFEKS:FNMSEJKFS SUCCESSSSS");
  }

  let socket, isLoggedIn, id, lastMsgId;

  // Initialize io
  socket = io();
  // Receive id
  socket.on('id', function(givenId) {
    id = givenId;
  });

  // Login Form
  $('#login').submit(function() {
    const name = $('#name').val();
    const lang = $('input:radio[name=lang]:checked').val();
    const err = $('#err');
    const modal = $('#loginModal');
    const overlay = $('#overlay');

    if (!name) {
      err.css("display", "block");
    } else {
      isLoggedIn = true;
      err.css("display", "none");
      modal.css("display", "none");
      overlay.css("display", "none");
      socket.emit('login', { name: name, lang: lang });
      $('#m').focus();
    }
    // Prevent page reload
    return false;
  });

  // Chat Form
  // When chat is submitted, clear it and emit the message
  $('#chatInput').submit(function() {
    const msg = $('#m').val();
    if (isLoggedIn) {
      if (msg !== "") {
        socket.emit('chat message', msg);
        $('#m').val('');
      }
      return false;
    }
    // Cause page reload of user not logged in
    return true;
  });

  // When chat message received, append to box
  socket.on('chat message', function(msgData) {
    // Not first msg for sender is client
    // Doesn't show name
    if (msgData.id === id && lastMsgId === msgData.id) {
      $('#messages')
      .append($('<li class="my-msg">').html(
        "<div>" + msgData.msg + "</div>"
        + "<div>" + msgData.tMsg + "</div>"
      ))
    // First msg for sender is client
    // Shows name above chat bubble
    } else if (msgData.id === id) {
      $('#messages')
      .append($('<li class="my-name">').text(msgData.name))
      .append($('<li class="my-msg">').html(
        "<div>" + msgData.msg + "</div>"
        + "<div>" + msgData.tMsg + "</div>"
      ))
    // Not first msg for sender is other
    // Don't show name
    } else if (lastMsgId === msgData.id) {
      $('#messages')
      .append($('<li class="their-msg">').html(
        "<div>" + msgData.msg + "</div>"
        + "<div>" + msgData.tMsg + "</div>"

      ))
    // First msg for sender is other
    // Show name
    } else {
      $('#messages')
      .append($('<li class="their-name">').text(msgData.name))
      .append($('<li class="their-msg">').html(
        "<div>" + msgData.msg + "</div>"
        + "<div>" + msgData.tMsg + "</div>"
      ))
    }
    $("#messages")
    .append($('<div style=\"clear:both\">'))
    .scrollTop($("#messages")[0].scrollHeight); // Scroll to bottom of chat
    lastMsgId = msgData.id;
  });

  // Displays login message when new users join
  socket.on('login msg', function(msg) {
    $('#messages').append($('<li class="login-msg">').text(msg));
  });

  // Update the active users' list
  socket.on('user list', function(users) {
    const count = Object.keys(users).length;
    $('span.active-count').text(count);


    $('#activeUsers').empty();
    for (const id in users) {
      const name = users[id].name;
      const lang = users[id].lang;
      $('#activeUsers').append($('<li class="user">').html(
        "<span class=\"name\">" + name + "</span>" + "<span class=\"lang\">" + lang + "</span>"
      ));
    }
  });
});

function toggleSidebar() {
  if ($('#sidebar').hasClass("mobile-show")) {
    $('#sidebar').removeClass("mobile-show");
  } else {
    $('#sidebar').addClass("mobile-show");
  }
}
