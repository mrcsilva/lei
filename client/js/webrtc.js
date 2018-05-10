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

// Username of the available peers provided by the signaling server
var availablePeers = [];

var moreOnServer = true;

function getReachable() {
    return reachable;
}

function getConnections() {
    return connections;
}

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
                    newConnection(list[Math.floor(Math.random() * Math.floor(list.length), true);
                }
                else {
                    // Send request to server
                    send({
                        data: "request_users"
                    }, name);
                }
            }
            else {
                // Send request to server
                send({
                    data: "request_users"
                }, name);
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

conn.onerror = function (err) {
   console.log("Got error", err);
};

// Configuration for RTCPeerConnection using Google's public STUN server
var configuration = {
   "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
};

function handleClientMessage(event) {
    console.log("Got message from peer!");
    var data = JSON.parse(event.data);
    if(data.type == "msg") {
        chatArea.innerHTML += data.user + ": " + data.message + "<br>";
        $('.chat').scrollTop($('.chat')[0].scrollHeight);
    }
    else if (data.type == "neighbours") {
        for(i = 0; i < data.message.length; i++) {
            if(data.message[i] != name && !reachable.has(data.message[i])) {
                reachable.set(data.message[i], data.user);
            }
        }
        showNeighbours(reachable);
    }
}

function handleChannelClose() {
    console.log("Data channel is closed!");
}

function handleChannelError(error) {
    console.log(error);
}

// Alias for sending JSON encoded messages to signaling server
function send(message, user) {

    // Attach the other peer username to our messages
    if (user) {
        message.name = user;
    }

    conn.send(JSON.stringify(message));
}

// Handle response from signaling server concerning ID registration
function handleLogin(success, peers) {

    if (success === false) {
        name = names[Math.floor(Math.random()*names.length)];
        send({
           type: "login",
           name: name
        });
    }
    else {
        loginPage.style.display = "none";
        callPage.style.display = "block";
        document.querySelector('.loginPage').style.marginBottom = 0;
        showName.innerHTML += name;

        showConnections(connections);
        showNeighbours(reachable);

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
                send({
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
                    showConnections(connections);
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
                send({
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
        send({
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

    showConnections(connections);

    reachable.delete(user);

    for(var [key, value] of reachable.entries()) {
        if(value==user) {
            reachable.delete(key);
        }
    }

    showNeighbours(reachable);
}

// When someone sends us neighbours
function handleNeighbours(msg, user) {
    for(i = 0; i < msg.length; i++) {
        reachable.set(msg[i], user);
    }
    showNeighbours(reachable);
}

// When server sends list of users
function handleUsers(users) {
    var us = users.split(";");
    for(i = 0; i < us.length-1; i++) {
        if(availablePeers.indexOf(us[i]) == -1 && us[i] != name) {
            availablePeers.push(us[i]);
        }
    }
}
