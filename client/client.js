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

callPage.style.display = "none";


// ******
// WebRTC
// ******

// Our username
var name;

// The actual connections that are running
var connections = [];

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
            handleLeave();
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

        var us = peers.split(";");
        for(i = 0; i < us.length-1; i++) {
            if(availablePeers.indexOf(us[i]) == -1 && us[i] != name) {
                availablePeers.push(us[i]);
            }
        }

        if(availablePeers.length > 0) {
            var num = Math.floor((Math.random() * availablePeers.length));
            newConnection(availablePeers[num]);
        }
    }
};

//initiating a call
function newConnection(user) {
    if (user.length > 0) {
        var dataChannel;

        var yourConn = new webkitRTCPeerConnection(configuration, null) || new mozRTCPeerConnection(configuration, null) || new RTCPeerConnection(configuration, null);

        // Setup ice handling
        yourConn.onicecandidate = function (event) {
            if (event.candidate) {
                send({
                    type: "candidate",
                    candidate: event.candidate
                }, name);
            }
        };

        yourConn.ondatachannel = function(ev) {
            console.log('Data channel is created!');
            ev.channel.onopen = function() {
                console.log('Data channel is open and ready to be used.');
                for(i = 0; i < connections.length; i++) {
                    if(user==connections[i].name) {
                        connections[i].channel = ev.channel;
                        break;
                    }
                }
            };

            ev.channel.onmessage = function (event) {
                chatArea.innerHTML += event.data + "\n";
            };

            ev.channel.onclose = function () {
                console.log("data channel is closed");
            };

            ev.channel.onerror = function(error) {
                console.log(error);
            }
        }
        if(yourConn) {
            console.log("RTC connection created!");
        }

        //creating data channel

        dataChannel = yourConn.createDataChannel("channel1", {ordered:false});

        dataChannel.onopen = function(event) {
            console.log("Data channel is open");
        };

        dataChannel.onerror = function (error) {
            console.log("Ooops...error:", error);
        };

        //when we receive a message from the other peer, display it on the screen
        dataChannel.onmessage = function (event) {
            chatArea.innerHTML += event.data + "\n";
        };

        dataChannel.onclose = function () {
            console.log("Data channel is closed");
        };

        if(dataChannel) {
            console.log("Data channel created!");
        }

        console.log("Sending offer!");

        // create an offer
        yourConn.createOffer(function (offer) {
            send({
                type: "offer",
                offer: offer
            }, name);
            yourConn.setLocalDescription(offer);
        }, function (error) {
            alert("Error when creating an offer");
        });

        var con = {
            name: user,
            connection: yourConn,
            channel: dataChannel
        };

        connections.push(con);

    }
}

//when somebody sends us an offer
function handleOffer(offer, user) {
    var conObj = null;

    for(i = 0; i < connections.length; i++) {
        if(user==connections[i].name) {
            conObj = connections[i];
            break;
        }
    }

    if(conObj) {
        if(conObj.connection.signalingState == "closed") {
            newConnection(user);
        }
        conObj.connection.setRemoteDescription(new RTCSessionDescription(offer));

        //create an answer to an offer
        conObj.connection.createAnswer(function (answer) {
            conObj.connection.setLocalDescription(answer);
            send({
                type: "answer",
                answer: answer
            }, name);
        }, function (error) {
            alert("Error when creating an answer");
        });
    }
    else {
        newConnection(user);

        for(i = 0; i < connections.length; i++) {
            if(user==connections[i].name) {
                conObj = connections[i];
                break;
            }
        }

        conObj.connection.setRemoteDescription(new RTCSessionDescription(offer));

        //create an answer to an offer
        conObj.connection.createAnswer(function (answer) {
            conObj.connection.setLocalDescription(answer);
            send({
                type: "answer",
                answer: answer
            }, name);
        }, function (error) {
            alert("Error when creating an answer");
        });

    }
};

//when we got an answer from a remote user
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

//when we got an ice candidate from a remote user
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

function handleLeave(user) {
    removeUser(user);
};

//when user clicks the "send message" button
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
