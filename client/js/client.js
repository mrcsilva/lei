//******************
//UI selectors block
//******************

var callPage = document.querySelector('#callPage');

var msgInput = $('#msgInput');
var sendMsgBtn = document.querySelector('#sendMsgBtn');

var chatArea = document.querySelector('#chatarea .chat');
var showName = document.querySelector('.name');
var showUsers = document.querySelector('.peers');

callPage.style.display = "none";

// Last position is messages
var lastPos = 0;

// ****************
// Webpage dynamics
// ****************

var isShift = false;

// Updates the list of users
async function updateUsers() {
    $(".users").empty();
    $(".users").append("<h3>Connected users</h3>");
    $(".users").append("<ul>");
    if(connections.size > 0 ) {
        for(var con of connections.values()) {
            $(".users ul").append("<li><a onClick='goDirect(\""+con.name+"\")'>" + con.name + "</a></li>");
        }
    }
    if(reachable.size > 0 ) {
        for(var con of reachable.keys()) {
            $(".users ul").append("<li><a onClick='goDirect(\""+con+"\")'>" + con + "</a></li>");
        }
    }
    if($(".users li").length == 0) {
        $(".users").empty();
        s$(".users").append("<h3>No connected peers!</h3>");
    }
    setInterval(function() {
        $(".users").empty();
        $(".users").append("<h3>Connected users</h3>");
        $(".users").append("<ul>");
        if(connections.size > 0 ) {
            for(var con of connections.values()) {
                $(".users ul").append("<li><a onClick='goDirect(\""+con.name+"\")'>" + con.name + "</a></li>");
            }
        }
        if(reachable.size > 0 ) {
            for(var con of reachable.keys()) {
                $(".users ul").append("<li><a onClick='goDirect(\""+con+"\")'>" + con + "</a></li>");
            }
        }
        if($(".users li").length == 0) {
            $(".users").empty();
        }
    }, 5000);
}

// Updates the chat area with new messages
async function updateMessages() {
    var array = messages.get("broadcast");
    setInterval(function() {
        for(var i = lastPos; i < array.length; i++) {
            var text = array[i].split(";")[1].split(":");
            if($(".chat .message-group").last().find(".message.first").find(".username").html() == text[0]) {
                var put = "<div class='message'>";
                put += "<div class='message-text'>" + text[1] + "</div></div>";
                $(".chat .message-group").last().append(put);
            }
            else {
                var put = "<div class='message-group'>";
                put += "<div class='message first'>" + "<div class='username'>" + text[0] + "</div>";
                put += "<div class='message-text'>" + text[1] + "</div></div></div>";
                $(".chat").append(put);
            }
            lastPos++;
        }

        $('.chat').scrollTop($('.chat')[0].scrollHeight);
    }, 500);
}

// Waits that the login on server is made
async function waitLogin() {
    var timePassed = 0;
    while(logged == false && timePassed < 10000) {
        timePassed += 1000;
        await sleep(1000);
    }
    if(timePassed < 10000) {
        loginPage.style.display = "none";
        callPage.style.display = "flex";
        document.querySelector('.loginPage').style.marginBottom = 0;

        var h = $(window).height()-$(".name").height()-$(".input").outerHeight()-20;

        $(".chat").css('height', h);

        updateMessages();
        updateUsers();
    }
    else {
        $(".loginPage h1 span").remove();
        $(".loginPage h1").html("Error while establishing the connection!<br>Please refresh the webpage!");
    }
}

function goDirect(user) {
    $(".name").html(user);

    $(".header").css("display", "flex");
    $(".header a").css("display", "block");
    $(".name").css("margin-right" ,"auto");

    $("#sendMsgBtn").attr("name", user);
}

function goBack() {
    $(".name").html("WebRTC Chat");

    $(".header").css("display", "block");
    $(".header a").css("display", "none");
    $(".name").css("margin-right" ,"");

    $("#sendMsgBtn").attr("name", "broadcast");
}

// When user clicks the "send message" button
sendMsgBtn.addEventListener("click", function (event) {
    var val = msgInput.val();
    if(val.length > 0) {
        var t = new Date();
        var date = t.getDate() + "-" + (t.getMonth()+1) + "-" + t.getFullYear() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds() + ":" + t.getMilliseconds();

        if($("#sendMsgBtn").attr("name") == "broadcast") {
            sendMessage("broadcast", name, date + ";" + name + ": " + val);
        }
        else {
            sendMessage("direct", $(".name").attr("name"), date + ";" + name + ": " + val);
        }

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
            var date = t.getDate() + "-" + (t.getMonth()+1) + "-" + t.getFullYear() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds() + ":" + t.getMilliseconds();

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

    waitLogin();

});
