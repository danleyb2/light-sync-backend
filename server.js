'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');
var mongo = require('mongodb').MongoClient;

const PORT = process.env.PORT || 3000;
const IP = process.env.IP || "0.0.0.0";
const INDEX = path.join(__dirname, 'index.html');

var app = express()
    //.use((req, res) => res.sendFile(INDEX) )
    // Routing


var server = require('http').createServer(app);
server.listen(PORT, IP, () => console.log(`Listening on ${ PORT }`));

app.use(express.static(__dirname + '/public'));

const io = socketIO(server);


io.on('connection', (socket) => {
    console.log('Client connected');
    var addedUser = false;

    //'mongodb://user:pass@ds029486.mlab.com:29486/heroku_n8vmk6lc'
    mongo.connect(process.env.MONGOLAB_URI, function(err, db) {

        if (err) {
            console.error("Could not connect to db");
        } else {

            // when the client emits 'new message', this listens and executes
            socket.on('new sync', function(data) {
                console.log("new sync: ");

                var collection = db.collection('syncs');
                collection.insert({
                    'data': data,
                    dateAdded: new Date()
                }, function(err, doc) {
                    console.log(doc);
                    socket.emit('new sync', doc[0]);
                });
                //  socket.broadcast.emit('new sync', data);

            });

            socket.on('login', function(data) {
                //console.log(data);
                var collection = db.collection('syncers');

                collection.findOne(data, {}, function(err, doc) {

                    if (doc) {
                        console.log("retrieved record:");
                        console.log(doc);
                        socket.emit('login', doc);

                        /*
                        var collection = db.collection('syncs');
                        var stream = collection.find().sort({ _id : -1 }).limit(5).stream();
    
                        stream.on('data', function (sync) {
                          //console.log(sync);
                          socket.emit('syncs', sync); 
                        });
                        */

                    } else {

                    }

                });

            });

            socket.on('register', function(data) {
                console.log(data);
                var collection = db.collection('syncers');

                collection.insert(data, function(err, doc) {
                    console.log("retrieved record:");
                    console.log(doc);
                });

            });

            // when the client emits 'add user', this listens and executes
            socket.on('add user', function(username) {
                if (addedUser) return;

                // we store the username in the socket session for this client
                socket.username = username;

                addedUser = true;



            });

            // when the client emits 'typing', we broadcast it to others
            socket.on('typing', function() {
                socket.broadcast.emit('typing', {
                    username: socket.username
                });
            });

            // when the client emits 'stop typing', we broadcast it to others
            socket.on('stop typing', function() {
                socket.broadcast.emit('stop typing', {
                    username: socket.username
                });
            });

            // when the user disconnects.. perform this
            socket.on('disconnect', function() {
                if (addedUser) {


                    // echo globally that this client has left
                    socket.broadcast.emit('user left', {
                        username: socket.username,

                    });
                }
            });
            socket.on('disconnect', () => {
                console.log('Client disconnected')

            });

        }
    });
});

//setInterval(() => io.emit('time', new Date().toTimeString()), 1000);