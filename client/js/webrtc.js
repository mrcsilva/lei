// ******
// WebRTC
// ******

// A IMPLEMENTAR!!!!!!!!
// - Quando um cliente perde a unica conexao que tem, tentar uma nova
// - Forma de comunicacao com um peer a mais de "dois saltos"

// Our username
var name;

// Possible names as an alias for the browser
var names = ["Nicolas", "Violet", "Calvin", "Autumn", "Briley", "Kelvin", "Oswaldo", "Remington", "Danielle", "Ross"];

// The actual connections that are running
// Key -> username
// Value -> Object described below
// Format of value
// {
// name: user::String,
// connection: connection::RTCPeerConnection,
// channel: dataChannel::RTCDataChannel
// }
var connections = new Map();

// Reachable peers from our connections
// Key - Peer::String
// Value - Neighbour::String
var reachable = new Map();

// All pending request for a route
// Key - Destination peer
// Value - Source peer of the request
var requests = new Map();

// Username of the available peers provided by the signaling server
var availablePeers = [];

// Messages on chat
var messages = new Map();
messages.set("broadcast", []);

// Still more peers available on server
var moreOnServer = true;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function keepConnections() {
    while(true) {
        if(connections.size < 2 && moreOnServer) {
            if(availablePeers.length > 0) {
                var list = [];
                for(var v of availablePeers) {
                    if(!connections.has(v) && !reachable.has(v)) {
                        list.push(v);
                    }
                }
                if(list.length != 0) {
                    newConnection(list[Math.floor(Math.random() * Math.floor(list.length))], true);
                }
                else {
                    // Send request to server
                    sendServer({
                        data: "request_users"
                    }, name);
                }
            }
            else {
                // Send request to server
                sendServer({
                    data: "request_users"
                }, name);
            }
        }
        else if(connections.size < 5 && moreOnServer) {
            var list = [];
            for(var v of availablePeers) {
                if(!connections.has(v) && !reachable.has(v)) {
                    list.push(v);
                }
            }
            if(list.length != 0) {
                newConnection(list[Math.floor(Math.random() * Math.floor(list.length))], true);
            }
        }
        else {
            await sleep(60000);
        }
    }
}

// Connecting to our signaling server
var conn = new WebSocket('ws://antenas.dynu.com:9090');

conn.onopen = function () {
   console.log("Connected to the signaling server");
};

conn.onerror = function (err) {
   console.log("Got error", err);
};

// When we got a message from a signaling server
conn.onmessage = function (msg) {
    console.log("Got message", msg.data);
    var data = JSON.parse(msg.data);

    switch(data.type) {
        case "login":
            handleLogin(data.success, data.users);
            break;
        //when somebody wants to call us
        case "offer":
            handleOffer(data.offer, data.name);
            break;
        case "answer":
            handleAnswer(data.answer, data.name);
            break;
        //when a remote peer sends an ice candidate to us
        case "candidate":
            handleCandidate(data.candidate, data.name);
            break;
        case "leave":
            handleLeave(data.name);
            break;
        case "hello":
            console.log(data.msg);
            break;
        case "neighbours":
            handleNeighbours(data.neighbours, data.name);
            break;
        case "users":
            handleUsers(data.users);
            break;
        default:
            break;
   }
};

// Configuration for RTCPeerConnection using Google's public STUN server
var configuration = {
   "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
};

// Handles all messages received from connected peers
// Here you should implement the logic of your application
// In this case we are using it to make a group chat and a direct message chat
// Do not change anything below neighbours else if!
function handleClientMessage(event) {
    console.log("Got message from peer!");
    var data = JSON.parse(event.data);
    if(data.type == "broadcast") {
        handleBroadcastMessage(data.source, data.message);
    }
    else if(data.type == "direct") {
        handleDirectMessage(data.source, data.destination, data.message);
    }
    else if (data.type == "neighbours") {
        for(i = 0; i < data.message.length; i++) {
            if(data.message[i] != name && !reachable.has(data.message[i])) {
                reachable.set(data.message[i], data.user);
            }
        }
    }
    else if(data.type == "request") {
        handleRequestRoute(data.sender, data.source, data.destination);
    }
    else if(data.type == "reply") {
        handleReplyRoute(data.source, data.destination);
    }
}

// Handles a reply for a route request
// src -> Neighbour that sent the reply
// dest -> Initial destination
function handleReplyRoute(src, dest) {
    var next;
    if(requests.has(dest)) {
        next = requests.get(dest);
        send({
            type: "reply",
            source: name,
            destination: dest
        }, next);
        request.delete(dest);
        // Update reachable table
        var t = new Date();
        reachable.set(dest, {destination: src, time: t.getTime()});
    }
}

// Handles a request for a route
// snd -> Sender of request
// src -> Source of request
// dest -> Destination peer
function handleRequestRoute(snd, src, dest) {
    if(reachable.has(dest)) {
        send({
            type: "reply",
            source: name,
            destination: dest
        }, snd);
        var t = new Date();
        reachable.set(src, {destination: snd, time: t.getTime()});
    }
    else {
        requests.set(dest, src);
        var temp = {
            type: "request",
            sender: name,
            source: src,
            destination: dest
        };
        for(var con of connections.values()){
            if(con.name != sender) {
                con.channel.send(JSON.stringify(temp));
            }
        }
    }
}

async function handleDirectMessage(src, dest, msg) {
    if(dest == name) {
        if(messages.has(dest)) {
            messages.get(dest).push(msg);
        }
        else {
            messages.set(dest, [msg]);
        }
    }
    else {
        var temp = {
            type: "direct",
            source: src,
            destination: dest,
            message: msg
        }
        if(connections.has(dest)) {
            connections.get(dest).channel.send(JSON.stringify(temp));
        }
        else if(reachable.has(dest)) {
            var obj = reachable.get(dest);
            if(typeof obj == "object") {
                var t = new Date();
                if((t.getTime() - obj.time)>300000) {
                    reachable.delete(dest);
                    requests.set(dest, name);
                    var tempReq = {
                        type: "request",
                        sender: name,
                        source: name,
                        destination: dest
                    };
                    for(var con of connections.values()){
                        con.channel.send(JSON.stringify(tempReq));
                    }
                    var trys = 0;
                    while(!reachable.has(dest) && trys < 3) {
                        await sleep(3000);
                        trys++;
                    }
                    if(trys < 3) {
                        connections.get(reachable.get(dest)).channel.send(JSON.stringify(temp));
                    }
                }
                else {
                    connections.get(obj.destination).channel.send(JSON.stringify(temp));
                }
            }
            else {
                connections.get(reachable.get(dest)).channel.send(JSON.stringify(temp));
            }
        }
        else {
            requests.set(dest, name);
            var tempReq = {
                type: "request",
                sender: name,
                source: name,
                destination: dest
            };
            for(var con of connections.values()){
                con.channel.send(JSON.stringify(tempReq));
            }
            var trys = 0;
            while(!reachable.has(dest) && trys < 3) {
                await sleep(3000);
                trys++;
            }
            if(trys < 3) {
                connections.get(reachable.get(dest)).channel.send(JSON.stringify(temp));
            }
        }
    }
}

function handleBroadcastMessage(src, msg) {
    var temp = {
        type: "broadcast",
        source: src,
        message: msg
    };
    if(!messages.get("broadcast").includes(msg)) {
        for(var con of connections.values()) {
            con.channel.send(JSON.stringify(temp));
        }
        messages.get("broadcast").push(msg);
    }
}

function handleChannelClose() {
    console.log("Data channel is closed!");
}

function handleChannelError(error) {
    console.log(error);
}

// Alias for sending JSON encoded messages to signaling server
function sendServer(message, user) {

    // Attach the other peer username to our messages
    if (user) {
        message.name = user;
    }

    conn.send(JSON.stringify(message));
}

// Alias for sending JSON encoded messages to user
function send(data, user) {
    var conObj = connections.get(user);

    conObj.channel.send(JSON.stringify(data));
}

// Handle response from signaling server concerning ID registration
function handleLogin(success, peers) {

    if (success === false) {
        name = names[Math.floor(Math.random()*names.length)];
        sendServer({
           type: "login",
           name: name
        });
    }
    else {
        var us = peers.split(";");
        for(i = 0; i < us.length-1; i++) {
            if(availablePeers.indexOf(us[i]) == -1 && us[i] != name) {
                availablePeers.push(us[i]);
            }
        }

        if(availablePeers.length > 0) {
            var num = Math.floor((Math.random() * availablePeers.length));
            newConnection(availablePeers[num], true);
        }

        // Keep always 2 connections at least if they are available
        // keepConnections();
    }
}

// Initiating a connection
// offer == true -> Connectio is proposed by local user
function newConnection(user, offer) {
    if (user.length > 0) {
        console.log("Starting connection with " + user);
        var dataChannel;


        var yourConn = new RTCPeerConnection(configuration, null);

        var con = {
            name: user,
            connection: yourConn,
            channel: null
        };

        connections.set(user, con);

        var conObj = connections.get(user);

        // Setup ice handling
        conObj.connection.onicecandidate = function (event) {
            if (event.candidate) {
                sendServer({
                    type: "candidate",
                    candidate: event.candidate
                }, user);
            }
        };

        conObj.connection.ondatachannel = function(ev) {
            console.log('Data channel is created!');
            ev.channel.onopen = function() {
                console.log('Data channel is open and ready to be used.');
                if(connections.has(user)) {
                    connections.get(user).channel = ev.channel;
                }
                console.log("Sending list of connected peers!");
                var list = [];
                for (var key of connections.keys()) {
                    list.push(key);
                }
                var obj = {
                    type: "neighbours",
                    user: name,
                    message: list
                };
                for(var con of connections.values()) {
                    con.channel.send(JSON.stringify(obj));
                }
            };
            ev.channel.onmessage = handleClientMessage;
            ev.channel.onclose = handleChannelClose;
            ev.channel.onerror = handleChannelError;
        }
        if(conObj.connection) {
            console.log("RTC connection created!");
        }

        // Se vai enviar offer
        if(offer==true) {
            // Creating dataChannel
            conObj.channel = conObj.connection.createDataChannel("channel1", {ordered:false});

            conObj.channel.onmessage = handleClientMessage;
            conObj.channel.onclose = handleChannelClose;
            conObj.channel.onerror = handleChannelError;

            // create an offer
            conObj.connection.createOffer(function (offer) {
                sendServer({
                    type: "offer",
                    offer: offer
                }, user);
                conObj.connection.setLocalDescription(offer);
            }, function (error) {
                alert("Error when creating an offer");
            });
        }

    }
}

// When somebody sends us an offer
// This indicates that he wants to make a connection
function handleOffer(offer, user) {
    var conObj = null;

    newConnection(user, false);

    conObj = connections.get(user);

    conObj.connection.setRemoteDescription(new RTCSessionDescription(offer));

    // Creating dataChannel
    conObj.channel = conObj.connection.createDataChannel("channel1", {ordered:false});

    conObj.channel.onmessage = handleClientMessage;
    conObj.channel.onclose = handleChannelClose;
    conObj.channel.onerror = handleChannelError;

    //create an answer to an offer
    console.log("Sending answer to " + conObj.name);
    conObj.connection.createAnswer(function (answer) {
        conObj.connection.setLocalDescription(answer);
        sendServer({
            type: "answer",
            answer: answer
        }, conObj.name);
    }, function (error) {
        alert("Error when creating an answer");
    });

}

// When we got an answer from a remote user
function handleAnswer(answer, user) {
    var conObj = null;


    if(connections.has(user)) {
        conObj = connections.get(user);
        conObj.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
}

// When we got an ice candidate from a remote user
function handleCandidate(candidate, user) {
    var conObj = null;

    if(connections.has(user)) {
        conObj = connections.get(user);
        conObj.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
}

// When a user leaves
function handleLeave(user) {
    console.log("User " + user + " disconnected!");
    // Remove user from connections
    if(connections.has(user)) {
        connections.get(user).connection.close();
    }
    connections.delete(user);

    // Remove user from available peers
    for(i = 0; i < availablePeers.length; i++) {
        if(availablePeers[i] == user) {
            break;
        }
    }
    availablePeers.splice(i,1);

    reachable.delete(user);

    for(var [key, value] of reachable.entries()) {
        if(value==user) {
            reachable.delete(key);
        }
    }
}

// When someone sends us neighbours
function handleNeighbours(msg, user) {
    for(i = 0; i < msg.length; i++) {
        reachable.set(msg[i], user);
    }
}

// When server sends list of users
function handleUsers(users) {
    moreOnServer = false;
    var us = users.split(";");
    for(i = 0; i < us.length-1; i++) {
        if(availablePeers.indexOf(us[i]) == -1 && us[i] != name) {
            availablePeers.push(us[i]);
            moreOnServer = true;
        }
    }
}

// ************
// API Funtions
// ************

async function sendMessage(type, dest, msg) {
    if(type == "broadcast") {
        handleBroadcastMessage(name, msg);
    }
    else {
        handleDirectMessage(name, dest, msg);
    }
}
