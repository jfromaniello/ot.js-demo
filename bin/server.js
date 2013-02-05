#!/usr/bin/env node

var ot = require('ot');
var MongoDBStore = require('../lib/MongoDBStore');

var express = require('express');
var socketIO = require('socket.io');
var path = require('path');
var http = require('http');

var app = express();
var appServer = http.createServer(app);

app.configure(function () {
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));
  app.use(express.logger());
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

var io = socketIO.listen(appServer);

// source: http://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
io.configure('production', function () {
  io.set('transports', ['xhr-polling']);
  io.set('polling duration', 10);
});

var str = "# This is a Markdown heading\n\n"
        + "1. un\n"
        + "2. deux\n"
        + "3. trois\n\n"
        + "Lorem *ipsum* dolor **sit** amet.\n\n"
        + "    $ touch test.txt";


var cmServers = [];

function getOrCreate (docId, callback) {
  if(cmServers[docId]) return callback(cmServers[docId]);
  var store = new MongoDBStore({url: 'mongodb://localhost:27017/otdemo'}, docId, function () {
    cmServers[docId] = new ot.CodeMirrorServerRoom(docId, store);

    cmServers[docId].onEmptyRoom = function () {
      console.log('last socket disconnected from document ' , docId);
      delete cmServers[docId];
    };

    callback(cmServers[docId]);

  });
}

io.sockets.on('connection', function (socket) {
  socket.on('login', function (obj) {
    if (typeof obj.name !== 'string') {
      console.error('obj.name is not a string');
      return;
    }

    socket.mayEdit = true;
    
    getOrCreate(obj.docId, function (server) {
      server.hook(socket, obj.name, function (){
        socket.emit('logged_in', {});
      });
    });
  });
});

app.get('/', function (req, res) {
  res.render('index', {
    docId: 'index'
  });
});

app.get('/doc/:docId', function (req, res) {
  res.render('index', {
    docId: req.params.docId
  });
});

var port = process.env.PORT || 3000;
appServer.listen(port, function () {
  console.log("Listening on port " + port);
});

process.on('uncaughtException', function (exc) {
  console.error(exc);
});
