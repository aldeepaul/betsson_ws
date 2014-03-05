var   cluster = require('cluster')
    , config = require('konfig')()
    , os = require('os');

//master node
if(cluster.isMaster){
    var server = require('http').createServer();
    var io = require('socket.io').listen(server);
    var fs = require('fs');
    var redis = require('redis');
    var RedisStore = require('socket.io/lib/stores/redis');
    var redisSubscriber = redis.createClient(config.app.redis_port, config.app.redis_server);



    io.set('store', new RedisStore({
        redisPub: redis.createClient(config.app.redis_port, config.app.redis_server),
        redisSub: redis.createClient(config.app.redis_port, config.app.redis_server),
        redisClient: redis.createClient(config.app.redis_port, config.app.redis_server)
    }));

    for (var i = 0; i < os.cpus().length; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });

    var custEmitter = {
        init: function(data){
            if(data.fn !== undefined){
                this[data.fn](data);
            }
        },
        //-- Game Actions --//
        eventsUpdate: function(d){
            io.sockets.in('EVENT' + d.data.EventId).emit(d.fn,d.data);
        },
        //-- Odds Update --//
        priceUpdate: function(d){
            io.sockets.in('EVENT' + d.data.EventId).emit(d.fn,d.data);
            //socket.broadcast.to(eventChannelPrefix + d.data.EventId).emit(d.fn,d.data);
        },
        //-- Market State --//
        stateUpdate: function(d){
            io.sockets.in('EVENT' + d.data.EventId).emit(d.fn,d.data);
        },
        //-- Market Selection State --//
        selectionStateUpdate: function(d){
            io.sockets.in('EVENT' + d.data.EventId).emit(d.fn,d.data);
        }
    };

//-- Grid Subscriber --//
    redisSubscriber.subscribe('thegrid');
    redisSubscriber.on("message", function (channel, message) {
        //io.sockets.emit('message', message);
        try {
            var data = JSON.parse(message);
            custEmitter.init(data);
        }catch (SyntaxError) {
            //console.log('json error');
        };
    });
}


//worker node
if(cluster.isWorker){
    var server = require('http').createServer()
        , io    = require('socket.io').listen(server)
        , redis = require('redis')
        , os    = require('os')
        , cluster = require('cluster')
        , config = require('konfig')()
        , SBPUSH  = {}
        , eventChannelPrefix    = 'EVENT'
        , redisSubscriber       = redis.createClient(config.app.redis_port, config.app.redis_server)
        , redisPublisher        = redis.createClient(config.app.redis_port, config.app.redis_server)
        , RedisStore            = require('socket.io/lib/stores/redis')
        , wspub    = redis.createClient(config.app.redis_port, config.app.redis_server)
        , wssub    = redis.createClient(config.app.redis_port, config.app.redis_server)
        , wsclient = redis.createClient(config.app.redis_port, config.app.redis_server);

    SBPUSH.display_info = function (socket){
        socket.send("Your Transport: " + io.transports[socket.id].name);
        socket.send("Redis Server: " + config.app.redis_server);
        socket.send("WebSocket: " + os.hostname());
    };

    SBPUSH.log2client = function(socket,msg){
        socket.send("Transport: " + io.transports[socket.id].name + "// Redis Data:" + JSON.stringify(msg));
    };

    SBPUSH.listallrooms = function(socket){
        socket.send("All Events: " + JSON.stringify(io.sockets.manager.rooms));

    };
    SBPUSH.listclientrooms = function(socket){
        socket.send("All Client Events: " + JSON.stringify(io.sockets.manager.roomClients[socket.id]));
    };

    io.configure(function() {
        io.set('transports', ['websocket','htmlfile', 'xhr-polling', 'jsonp-polling']);
//        io.set('resource', '/grid.websocket/socket.io');
    });

    io.set('store', new RedisStore({
        redis    : redis
        , redisPub : wspub
        , redisSub : wssub
        , redisClient : wsclient
    }));


    io.enable('browser client minification');  // send minified client
    io.enable('browser client etag');          // apply etag caching logic based on version number
    //io.enable('browser client gzip');          // gzip the file
    //io.set('log level', 1);                    // reduce logging

    io.sockets.on('connection', function (socket) {
        SBPUSH.display_info(socket);
        socket.on('subscribeEvent', function(eventId) {
            socket.join('EVENT' + eventId);
            io.sockets.in('EVENT' + eventId).send('>>> Subscribing to event:' + eventId);
            data = {
                fn: "subscribeEvent",
                eventId: eventId
            };
            SBPUSH.log2client(socket,data);
            SBPUSH.listallrooms(socket);
            SBPUSH.listclientrooms(socket);
        });

        socket.on('unSubscribeEvent', function(eventId) {
            io.sockets.in('EVENT' +  data.eventId).send('>>> Un-Subscribing to event:' +  data.eventId);
            socket.leave('EVENT' +  data.eventId);
            data = {
                fn: "unSubscribeEvent",
                eventId: eventId
            };
            SBPUSH.log2client(socket,data);
            SBPUSH.listallrooms(socket);
            SBPUSH.listclientrooms(socket);
        });

        //-- Publish Mock (remove on prod) --//
        socket.on('redisPublish', function(message){
            redisPublisher.publish('thegrid',message);
        });
    });

    server.listen(config.app.node_port);
}








