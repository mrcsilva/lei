//******
//UI selectors block
//******

var loginPage = document.querySelector('#loginPage');
var usernameInput = document.querySelector('#usernameInput');
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage');
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn');

var hangUpBtn = document.querySelector('#hangUpBtn');
var msgInput = document.querySelector('#msgInput');
var sendMsgBtn = document.querySelector('#sendMsgBtn');

var chatArea = document.querySelector('#chatarea textarea');
var displayName = document.querySelector('.displayName');
var showName = document.querySelector('.displayName .name');
var showCons = document.querySelector('.conPeers');
var showReach = document.querySelector('.reachPeers');

callPage.style.display = "none";

// ******
// Webpage dynamics
// ******

function showConnection(user) {
    if(showCons.innerHTML.length == 0) {
        showCons.innerHTML = "Connected Peers: "+user;
    }
    else {
        showCons.innerHTML += ", "+user;
    }
}

function removeConnectionDisplay(user) {



}


// ******
// WebRTC
// ******

// Our username
var name;

// The actual connections that are running
var connections = [];
// Formato do conteudo
// {
// name: user,
// connection: connection,
// channel: dataChannel
// };

// Neighbours are the reachable peers from our connection
var neighbours = [];
// Format of content
// {
// peer: String,
// neighbour: String
// }

// Username of the available peers provided by the signaling server
var availablePeers = [];


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
        { "url": "stun:stun.l.google.com:19302" }
    ]
};

// Alias for sending JSON encoded messages
function send(message, user) {

    // Attach the other peer username to our messages
    if (user) {
        message.name = user;
    }

    conn.send(JSON.stringify(message));
};

function handleLogin(success, peers) {

    if (success === false) {
        alert("Ooops...try a different username");
    }
    else {
        loginPage.style.display = "none";
        callPage.style.display = "block";
        document.querySelector('.loginPage').style.marginBottom = 0;
        showName.innerHTML += name;

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
};

// Initiating a connection
function newConnection(user, offer) {
    if (user.length > 0) {
        console.log("Starting connection with " + user);
        var dataChannel;

        var yourConn = new webkitRTCPeerConnection(configuration, null) || new mozRTCPeerConnection(configuration, null) || new RTCPeerConnection(configuration, null);

        var con = {
            name: user,
            connection: yourConn,
            channel: null
        };

        connections.push(con);

        var conObj;
        for(i = 0; i < connections.length; i++) {
            if(connections[i].name == user) {
                conObj = connections[i];
                break;
            }
        }

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
                for(i = 0; i < connections.length; i++) {
                    if(user==connections[i].name) {
                        connections[i].channel = ev.channel;
                        showConnection(user);
                        break;
                    }
                }
            };

            ev.channel.onmessage = function (event) {
                console.log("Got message from peer!");
                chatArea.innerHTML += event.data + "\n";
            };

            ev.channel.onclose = function () {
                console.log("Data channel is closed!");
            };

            ev.channel.onerror = function(error) {
                console.log(error);
            }
        }
        if(conObj.connection) {
            console.log("RTC connection created!");
        }

        // Se vai enviar offer
        if(offer==true) {
            // Creating dataChannel
            conObj.channel = conObj.connection.createDataChannel("channel1", {ordered:false});
            conObj.channel.onmessage = function (event) {
                console.log("Got message from peer!");
                chatArea.innerHTML += event.data + "\n";
            };

            conObj.channel.onclose = function () {
                console.log("Data channel is closed!");
            };

            conObj.channel.onerror = function(error) {
                console.log(error);
            }

            console.log("Sending offer to " + user + "!");
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

    for(i = 0; i < connections.length; i++) {
        if(user==connections[i].name) {
            conObj = connections[i];
            break;
        }
    }

    conObj.connection.setRemoteDescription(new RTCSessionDescription(offer));

    // Creating dataChannel
    conObj.channel = conObj.connection.createDataChannel("channel1", {ordered:false});
    conObj.channel.onmessage = function (event) {
        console.log("Got message from peer!");
        chatArea.innerHTML += event.data + "\n";
    };

    conObj.channel.onclose = function () {
        console.log("Data channel is closed!");
    };

    conObj.channel.onerror = function(error) {
        console.log(error);
    }

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

};

// When we got an answer from a remote user
function handleAnswer(answer, user) {
    var conObj = null;

    for(i = 0; i < connections.length; i++) {
        if(user==connections[i].name) {
            conObj = connections[i];
            break;
        }
    }
    if(conObj) {
        conObj.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
};

// When we got an ice candidate from a remote user
function handleCandidate(candidate, user) {
    var conObj = null;

    for(i = 0; i < connections.length; i++) {
        if(user==connections[i].name) {
            conObj = connections[i];
            break;
        }
    }

    if(conObj) {
        conObj.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
};

// When a user leaves
function handleLeave(user) {
    console.log("User " + user + " disconnected!");
    for(i = 0; i < connections.length; i++) {
        if(connections[i].name == user) {
            connections[i].connection.close();
            break;
        }
    }
    connections.splice(i,1);
    for(i = 0; i < availablePeers.length; i++) {
        if(availablePeers[i] == user) {
            break;
        }
    }
    availablePeers.splice(i,1);
    removeConnectionDisplay(user);
};

// When user clicks the "send message" button
sendMsgBtn.addEventListener("click", function (event) {
    var val = msgInput.value;
    chatArea.innerHTML += name + ": " + val + "\n";
    $('#chatarea textarea').scrollTop($('#chatarea textarea')[0].scrollHeight);
    //sending a message to a connected peer
    for(i = 0; i < connections.length; i++) {
        connections[i].channel.send(name + ": " + val);
    }
    msgInput.value = "";
});
