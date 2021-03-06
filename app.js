
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , os = require('os')
  , url = require('url')
  , path = require('path');

var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    res.send(200);
  }
  else {
    next();
  }
};

app.configure(function(){
  app.use(allowCrossDomain);
  app.set('port', process.env.PORT || 8888);
  app.set('views', __dirname + '/');
  app.set('view engine', 'html');
  app.engine('html', require('ejs').renderFile);            //Usa EJS com extensão .html
  app.use(express.static(path.join(__dirname, '/player')));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//Configurações apenas para o HEROKU
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

//Rotas
app.get('/',  function(req, res){
  res.render('player/masterPlayer/index.html');
  app.set('hostname', ( req.headers.host.match(/:/g) ) ? req.headers.host.slice( 0, req.headers.host.indexOf(":") ) : req.headers.host);
});

app.get('/remote/:ID', function(req, res){
  res.render('player/controlPlayer/index.html');
});

server.listen(app.get('port'), function(){
  console.log('Server iniciado na porta ' + app.get('port'));
});

/*
 * Configurações do player 
 * ***********************
 */

//Configurações globais
var PLAYER = {
  //socketID: null
};

//IO
io
  .of('/player')
    .on('connection', function(socket){
      //Envia sucesso de conexão
      socket.emit('message', {
        code: 'connect',
        hostname: os.hostname(),
        port: app.get('port'),
        url: app.get('hostname')
      });

      socket.on('message', function(data){
        //Verifica ID
        if(data.playerID == ('undefined' || 'null' || null || '')) {
          socket.emit('authenticateMessage', {code: '001', message: 'Autenticação falhou.'});
          return false;
        }

        //Seta ID
        PLAYER[data.playerID] = {
          socketID: socket.id,
          socket: socket
        };
        console.log('Usuário entrou. Player id: ' + data.playerID + ' Socket: ' + PLAYER[data.playerID].socketID);
        socket.emit('authenticateMessage', {code: '000', socketID: PLAYER[data.playerID].socketID});
      });

      //Métodos de controle de música
      socket.on('musicControl', function(data){
        //Verifica se está com ID
        if(data.to == ('undefined' || 'null' || null || '')) {
          socket.emit('message', {code: '001', message: 'O ID retornou nulo ou indefinido'});
          return false;
        }

        //Envia ação
        PLAYER[data.to].socket.emit('musicControl', data);
      });
    });