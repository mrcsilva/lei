// ******
// WebRTC
// ******

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

// Indicates if the user is logged
var logged = false;

// Max size for chuck when sending files
var chunckSize = 16384;

// Buffer to receive data
var receiveBuffer = [];

// Size of received data
var receivedSize = 0;

// Verify if an object is parsable by JSON
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

// Create promise to sleep for ms miliseconds
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Keeps at least 2 connections with other peers
async function keepConnections() {
    var sleeps = 0;
    await sleep(1000);
    while(true) {
        if(connections.size < 2 && moreOnServer) {
            console.log("Too low on connections! Trying more...");
            sleeps = 5;
            if(availablePeers.length > 0) {
                var list = [];
                for(var v of availablePeers) {
                    if(!connections.has(v) && !reachable.has(v)) {
                        list.push(v);
                    }
                }
                if(list.length != 0) {
                    console.log(list);
                    newConnection(list[Math.floor(Math.random() * Math.floor(list.length))], true);
                }
                else {
                    moreOnServer = false;
                }
            }
            else {
                moreOnServer = false;
            }
        }
        else if(connections.size < 2 && moreOnServer) {
            console.log("Attempting increase of connections...");
            sleeps = 5;
            var list = [];
            for(var v of availablePeers) {
                if(!connections.has(v) && !reachable.has(v)) {
                    list.push(v);
                }
            }
            if(list.length != 0) {
                console.log(list);
                newConnection(list[Math.floor(Math.random() * Math.floor(list.length))], true);
            }
            else {
                moreOnServer = false;
            }
        }
        else {
            if(sleeps > 4) {
                sendServer({
                    type: "request_users"
                }, name);
                sleeps = 0;
            }
            else {
                sleeps++;
            }
            console.log("Nothing more on server!");
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
    if(IsJsonString(event.data)) {
        var data = JSON.parse(event.data);
        if(data.type == "broadcast") {
            handleBroadcastMessage(data.sender, data.source, data.message);
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
            handleReplyRoute(data.sender, data.source, data.destination);
        }
        else if(data.type == "file") {
            fileName = data.name;
            fileType = data.fileType;
            fileSize = data.size;
            fileSrc = data.source;
            fileDst = data.destination;
        }
    }
    else {
        receiveBuffer.push(event.data);
        receivedSize += event.data.byteLength;

        if (receivedSize === file.size) {
            var received = new window.Blob(receiveBuffer);
            handleFile(received, fileName, fileType, fileSize, src, dst);
        }
    }
}

function handleFile(buffer, name, type, size, src, dst) {

}

// Handles a reply for a route request
// src -> Neighbour that sent the reply
// dest -> Initial destination
function handleReplyRoute(snd, src, dest) {
    var next;
    if(reachable.has(dest) && typeof reachable.get(dest) == "object") {
        next = reachable.get(dest).destination;
        if(next != "") {
            send({
                type: "reply",
                sender: name,
                source: src,
                destination: dest
            }, next);
        }
        // Update reachable table
        var t = new Date();
        reachable.set(dest, {destination: snd, time: t.getTime()});
    }
}

// Handles a request for a route
// snd -> Sender of request
// src -> Source of request
// dest -> Destination peer
function handleRequestRoute(snd, src, dest) {
    if(reachable.has(dest)) {
        console.log("Answered!");
        send({
            type: "reply",
            sender: name,
            source: src,
            destination: dest
        }, snd);
        var t = new Date();
        reachable.set(src, {destination: snd, time: t.getTime()});
    }
    else {
        console.log("Forwarded!");
        // Prevents multiple broadcasts of same request
        if(!reachable.has(dest)) {
            reachable.set(dest, {destination: snd, time: -1});
            var temp = {
                type: "request",
                sender: name,
                source: src,
                destination: dest
            };
            for(var con of connections.values()){
                if(con.name != snd) {
                    con.channel.send(JSON.stringify(temp));
                }
            }
        }
    }
}

// Handles a direct message received
// Message can be for this peer or for another one
// In case it's for another one this peer checks if it has a valid entry in reachable table
// If it hasn't sends a request for a route
async function handleDirectMessage(src, dest, msg) {
    // If he is the destination
    if(dest == name) {
        // If exists the source in messages push it to array
        // Else create new entry
        if(messages.has(src)) {
            if(msg.split(";").size <= 2) {
                messages.get(src).messages.push({type:"text", message: msg});
            }
            else {
                var split = msg.split(";");
                var msgFinal = split[1] + ";" + split[2] + ":" + split[3];
                messages.get(src).messages.push({type:"file", message: msgFinal});
            }
        }
        else {
            messages.set(src, {position: 0, messages: [{type:"text", message: msg}]});
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
            // If the entry on reachable is object means that it was added by a reply to a route request
            if(typeof obj == "object") {
                var t = new Date();
                // If entry is more than 5 minutes old it gets refreshed
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
                connections.get(obj).channel.send(JSON.stringify(temp));
            }
        }
        else {
            console.log("Request " + dest);
            reachable.set(dest, {destination: "", time: -1});
            var tempReq = {
                type: "request",
                sender: name,
                source: src,
                destination: dest
            };
            for(var con of connections.values()){
                con.channel.send(JSON.stringify(tempReq));
            }
            var trys = 0;
            while(reachable.get(dest).time == -1 && trys < 3) {
                await sleep(3000);
                trys++;
            }
            if(trys < 3) {
                connections.get(reachable.get(dest).destination).channel.send(JSON.stringify(temp));
            }
        }
    }
}

// This function sends to all it's connected peers the message received
// It doens't send back to the peer that sent him the message
// If the message was already broadcasted this functions discards it
function handleBroadcastMessage(snd, src, msg) {
    var temp = {
        type: "broadcast",
        sender: name,
        source: src,
        message: msg
    };
    if(!messages.get("broadcast").includes(msg)) {
        for(var con of connections.values()) {
            if(con.name != snd) {
                con.channel.send(JSON.stringify(temp));
            }
        }
        messages.get("broadcast").push(msg);
    }
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
        logged = true;
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

        // Keep always 2 connections at least if possible
        keepConnections();
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
                    if(con.channel.readyState == "open") {
                        con.channel.send(JSON.stringify(obj));
                    }
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

// Handles DataChannel closing
function handleChannelClose(event) {
    console.log("Data channel is closed!");
}

// Handles the error when creating DataChannel
function handleChannelError(error) {
    console.log(error);
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
        handleBroadcastMessage(name, name, msg);
    }
    else if(type == "direct") {
        if(messages.has(dest)) {
            messages.get(dest).messages.push({type:"text", message: msg});
        }
        else {
            messages.set(dest, {position: 0, messages: [{type:"text", message: msg}]});
        }
        handleDirectMessage(name, dest, msg);
    }
    else if(type == "file") {
        var split = msg.split(";");
        var msgFinal = split[1] + ";" + split[2] + ":" + split[3];
        if(messages.has(dest)) {
            messages.get(dest).messages.push({type:"text", message: msgFinal});
        }
        else {
            messages.set(dest, {position: 0, messages: [{type:"text", message: msgFinal}]});
        }
        handleDirectMessage(name, dest, msg);
        sendFile(dest);
    }
}


async function sendFile(dst, file) {
    var channel = 1;
    if(connections.has(dst)) {
        channel = connecions.get(dst).channel;
    }
    else if(reachable.has(dst)) {
        channel = connections.get(reachable.get(dst)).channel;
    }
    if(channel!==1) {
        var sliceFile = function(offset) {
            var reader = new window.FileReader();
            reader.onload = (function() {
                return function(e) {
                    channel.send(e.target.result);
                    if (file.size > offset + e.target.result.byteLength) {
                        window.setTimeout(sliceFile, 0, offset + chunkSize);
                    }
                    sendProgress.value = offset + e.target.result.byteLength;
                };
            })(file);
            var slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);
        };
        sliceFile(0);
    }
}
