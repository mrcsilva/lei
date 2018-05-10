//******************
//UI selectors block
//******************

var loginPage = document.querySelector('#loginPage');
var usernameInput = document.querySelector('#usernameInput');
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage');
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn');

var hangUpBtn = document.querySelector('#hangUpBtn');
var msgInput = $('#msgInput');
var sendMsgBtn = document.querySelector('#sendMsgBtn');

var chatArea = document.querySelector('#chatarea .chat');
var displayName = document.querySelector('.displayName');
var showName = document.querySelector('.displayName .name');
var showCons = document.querySelector('.conPeers');
var showReach = document.querySelector('.reachPeers');

callPage.style.display = "none";

// ****************
// Webpage dynamics
// ****************

var isShift = false;

function showConnections(connections) {
    showCons.innerHTML = "Connected Peers: ";
    if(connections.size > 0) {
        showCons.innerHTML += Array.from(connections.keys()).join(", ");
    }
    else {
        showCons.innerHTML += "No connected peers!";
    }
}

function showNeighbours(reachable) {
    showReach.innerHTML = "Reachable Peers: ";
    if(reachable.size > 0) {
        showReach.innerHTML += Array.from(reachable.keys()).join(", ");
    }
    else {
        showReach.innerHTML += "Connected peers doesn't have relevant neighbours";
    }
}

// When user clicks the "send message" button
sendMsgBtn.addEventListener("click", function (event) {
    var val = msgInput.val();
    chatArea.innerHTML += name + ": " + val + "<br>";
    $('.chat').scrollTop($('.chat')[0].scrollHeight);

    var obj = {
        type: "msg",
        user: name,
        message: val
    };

    //sending a message to the connected peers
    for(i = 0; i < connections.length; i++) {
        connections[i].channel.send(JSON.stringify(obj));
    }
    msgInput.val('');
});

// When user clicks Enter send a message
$(document).keyup(function (e) {
    if(e.which == 13 && isShift == false) {
        msgInput.val('');
    }
    if(e.which == 16) {
        isShift = false;
    }
}).keydown(function (e) {
    if(e.which == 16) isShift = true;
    if(e.which == 13 && isShift == false) {
        var val = msgInput.val();
        if(val.length > 0) {
            chatArea.innerHTML += name + ": " + val + "<br>";
            $('.chat').scrollTop($('.chat')[0].scrollHeight);
            var obj = {
                type: "msg",
                user: name,
                message: val
            };
            //sending a message to a connected peer
            for(i = 0; i < connections.length; i++) {
                connections[i].channel.send(JSON.stringify(obj));
            }
            msgInput.val('');
        }
    }
});
