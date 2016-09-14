$(function() {
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms


    // Initialize variables
    var $window = $(window);

    var $usernameInput = $('#username'); // Input for username
    var $passwordInput = $('#password'); // Input for password

    var $loginButton = $('#login-button');
    var $syncButton = $('#sync-button');

    var $messages = $('#syncs'); // Messages area

    var $inputMessage = $('#sync-input'); // Input message input box

    var $loginPage = $('#login-section'); // The login page
    var $chatPage = $('#sync-section'); // The chatroom page
    var $syncTemplate = $('.sync-template');


    // Prompt for setting a username
    var username;
    var password;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();

    var socket = io();


    // Sets the client's username
    function login() {
        username = cleanInput($usernameInput.val().trim());
        password = cleanInput($passwordInput.val().trim());

        // If username is valid
        if (username && password) {
            // Tell the server your username
            socket.emit('login', {
                'username': username,
                'password': password
            });
        }
    }

    // Sends a chat message
    function sendMessage() {
        var message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');

            // tell server to execute 'new message' and send along one parameter
            socket.emit('new sync', message);
        }
    }

    // Log a message
    function log(message, options) {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }


    function sync() {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
    }

    // Adds the visual chat message to the message list
    function addChatMessage(data) {

        var $messageDiv = $syncTemplate.clone()
            .removeClass('hide')
            .removeClass('sync-template');

        //data = JSON.parse(data);

        $('.content', $messageDiv).text(data['data']);
        $('.card-title', $messageDiv).text(new Date(data['dateAdded']).toGMTString());


        addMessageElement($messageDiv, {});
    }

    // Adds the visual chat typing message
    function addChatTyping(data) {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    }

    // Removes the visual chat typing message
    function removeChatTyping(data) {
        getTypingMessages(data).fadeOut(function() {
            $(this).remove();
        });
    }

    // Adds a message element to the messages and scrolls to the bottom
    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    function addMessageElement(el, options) {
        var $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = true;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    // Prevents input from having injected markup
    function cleanInput(input) {
        return $('<div/>').text(input).text();
    }

    // Updates the typing event
    function updateTyping() {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(function() {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }


    // Keyboard events
    $window.keydown(function(event) {
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            //$currentInput.focus();
        }
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            if (username && password) {
                sync();
            } else {
                login();
            }
        }
    });

    $inputMessage.on('input', function() {
        updateTyping();
    });

    // Click events
    $loginButton.click(function(evt) {
        evt.preventDefault();
        login();
    });

    $syncButton.click(function(evt) {
        evt.preventDefault();
        sync();
    });

    // Focus input when clicking on the message input's border
    $inputMessage.click(function() {
        $inputMessage.focus();
    });

    // Socket events

    // Whenever the server emits 'login', log the login message
    socket.on('login', function(data) {

        connected = true;

        $loginPage.fadeOut();
        $chatPage.removeClass("hide");
        $chatPage.show();

        $loginButton.off('click');
        $currentInput = $inputMessage.focus();

    });

    // Whenever the server emits 'new message', update the chat body
    socket.on('new sync', function(data) {
        console.log(data);
        addChatMessage(data);
    });

    socket.on('syncs', function(data) {
        console.log(data);
        addChatMessage(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('typing', function(data) {
        addChatTyping(data);
    });

    // Whenever the server emits 'stop typing', kill the typing message
    socket.on('stop typing', function(data) {
        removeChatTyping(data);
    });
});