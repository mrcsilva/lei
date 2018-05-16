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

// Last position is messages
var lastPos = 0;

// ****************
// Webpage dynamics
// ****************

var isShift = false;

async function updateConnections() {
    setInterval(function() {
        showCons.innerHTML = "Connected Peers: ";
        if(connections.size > 0) {
            showCons.innerHTML += Array.from(connections.keys()).join(", ");
        }
        else {
            showCons.innerHTML += "No connected peers!";
        }
    }, 5000);
}

async function updateNeighbours() {
    setInterval(function() {
        showReach.innerHTML = "Reachable Peers: ";
        if(reachable.size > 0) {
            showReach.innerHTML += Array.from(reachable.keys()).join(", ");
        }
        else {
            showReach.innerHTML += "Connected peers doesn't have relevant neighbours";
        }
    }, 5000);
}

async function updateMessages() {
    var array = messages.get("broadcast");
    setInterval(function() {
        for(var i = lastPos; i < array.length; i++) {
            chatArea.innerHTML += array[i].split(";")[1] + "<br>";
            lastPos++;
        }

        $('.chat').scrollTop($('.chat')[0].scrollHeight);
    }, 500);
}

function waitLogin() {
    loginPage.style.display = "none";
    callPage.style.display = "block";
    document.querySelector('.loginPage').style.marginBottom = 0;
    showName.innerHTML += name;

    updateMessages();
    // updateNeighbours();
    updateConnections();
}

// When user clicks the "send message" button
sendMsgBtn.addEventListener("click", function (event) {
    var val = msgInput.val();
    if(val.length > 0) {
        var t = new Date();
        var date = t.getDate() + "-" + (t.getMonth()+1) + "-" + t.getFullYear() + " " + t.getHours() + ":" + t.getMinutes();

        sendMessage("broadcast", name, date + ";" + name + ": " + val);

        msgInput.val('');
    }
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
            var t = new Date();
            var date = t.getDate() + "-" + (t.getMonth()+1) + "-" + t.getFullYear() + " " + t.getHours() + ":" + t.getMinutes();

            sendMessage("broadcast", name, date + ";" + name + ": " + val);

            msgInput.val('');
        }
    }
});

$(document).ready(function() {
    name = names[Math.floor(Math.random()*names.length)];

    setTimeout(function () {
        if (name.length > 0) {
           sendServer({
              type: "login",
              name: name
           });
        }
    }, 2000);

    setTimeout(waitLogin(), 2100);

});
