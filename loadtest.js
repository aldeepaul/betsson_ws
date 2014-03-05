// npm install
var WebSocket = require('ws');
var io = require('socket.io-client');
var log = require('npmlog');

log.level = 'verbose';

var sockets = [];
var maxSockets = 2000; // max 400
var connectionAttempts = 0;

function connectToWebSocket() {
    connectionAttempts++;
    for(var i= 0; i < maxSockets; i++){
        log.info('spawning: '+ connectionAttempts);

        var socket = io.connect('wrkphdevalad', {
            port: 3000
        });
        socket.on('connect', function () { console.log("socket connected"); });
        socket.on('msg', function(data){
            log.info('msg received : ' + data);
        });
        socket.emit('private message', { user: 'me', msg: 'whazzzup?' });

        sockets.push(socket);
    }
    //if (connectionAttempts < maxSockets) {
        //setTimeout(connectToWebSocket, 500);
    //}

};

//setInterval(connectToWebSocket,2000);
connectToWebSocket();