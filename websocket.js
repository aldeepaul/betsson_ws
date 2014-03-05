const PORT = 3000;
const HOST = 'localhost';
var cluster = require('cluster');
if(cluster.isMaster){
    var express = require('express'),
        app = express(),
        server = require('http').createServer(app),
        io = require('socket.io').listen(server),
        redis = require('redis');

    var RedisStore = require('socket.io/lib/stores/redis');
    var redis = require('socket.io/node_modules/redis');

    io.set('store', new RedisStore({
        redisPub: redis.createClient('6379', 'BMAN-QA-RD1'),
        redisSub: redis.createClient('6379', 'BMAN-QA-RD1'),
        redisClient: redis.createClient('6379', 'BMAN-QA-RD1')
    }));

    var numCPUs = require('os').cpus().length;

    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });


    setInterval(function(){
        io.sockets.emit('msg', 'rand: ' + Math.random());
        console.log('emitting msg');
    }, 1000);
}

if(cluster.isWorker){
    var express = require('express'),
        app = express(),
        server = require('http').createServer(app),
        io = require('socket.io').listen(server),
        redis = require('redis'),
        cluster = require('cluster');

    var RedisStore = require('socket.io/lib/stores/redis');
    var redis = require('socket.io/node_modules/redis');

    io.set('store', new RedisStore({
        redisPub: redis.createClient('6379', 'BMAN-QA-RD1'),
        redisSub: redis.createClient('6379', 'BMAN-QA-RD1'),
        redisClient: redis.createClient('6379', 'BMAN-QA-RD1')
    }));

    io.sockets.on('connection', function (socket) {
        socket.emit('msg', 'connected to worker: ' + cluster.worker.id);
    });

    server.listen(PORT);
    app.use(express.static(__dirname + '/public'));
}
