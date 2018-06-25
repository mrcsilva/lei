//******************
//UI selectors block
//******************

var callPage = document.querySelector('#callPage');

var msgInput = $('#msgInput');
var sendMsgBtn = document.querySelector('#sendMsgBtn');

var chatArea = document.querySelector('#chatarea .chat');
var showName = document.querySelector('.name');
var showUsers = document.querySelector('.peers');

var inputs = document.querySelectorAll( '.inputfile' );
var label = document.querySelectorAll('label');
var upImage = document.querySelectorAll( 'svg' );

$('label').bind('mouseenter', function(e) {
    $('svg').css('fill', '#aaaaaa');
    $('label').css('color', '#aaaaaa');
});

$('label').bind('mouseleave', function(e) {
    $('svg').css('fill', 'white');
    $('label').css('color', 'white');
});

Array.prototype.forEach.call( inputs, function( input )
{
    var label     = input.nextElementSibling,
        labelVal = label.innerHTML;

    input.addEventListener( 'change', function( e )
    {
        var fileName = '';
        if( this.files && this.files.length > 1 )
            fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );
        else
            fileName = e.target.value.split( '\\' ).pop();

        if( fileName )
            label.querySelector( 'span' ).innerHTML = fileName;
        else
            label.innerHTML = labelVal;
    });
});

callPage.style.display = "none";

// Last position in messages
var lastPos = 0;

// ****************
// Webpage dynamics
// ****************

var chunckSize = 64000;
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
    if(availablePeers.length > 0 ) {
        for(var con of availablePeers) {
            if(!connections.has(con)) {
                $(".users ul").append("<li><a onClick='goDirect(\""+con+"\")'>" + con + "</a></li>");
            }
        }
    }
    if($(".users li").length == 0) {
        $(".users ul").remove();
        $(".users").append("<h3>No connected peers!</h3>");
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
        if(availablePeers.length > 0 ) {
            for(var con of availablePeers) {
                if(!connections.has(con)) {
                    $(".users ul").append("<li><a onClick='goDirect(\""+con+"\")'>" + con + "</a></li>");
                }
            }
        }
        if($(".users li").length == 0) {
            $(".users ul").remove();
            $(".users").append("<h3>No connected peers!</h3>");
        }
    }, 5000);
}

// Updates the chat area with new messages
async function updateMessagesBroadcast() {
    var array = messages.get("broadcast");
    setInterval(function() {
        for(var i = lastPos; i < array.length; i++) {
            var text = array[i].split(";")[1].split(":");
            if($(".chat[name='broadcast'] .message-group").last().find(".message.first").find(".username").html() == text[0]) {
                var put = "<div class='message'>";
                put += "<div class='message-text'>" + text[1] + "</div></div>";
                $(".chat[name='broadcast'] .message-group").last().append(put);
            }
            else {
                var put = "<div class='message-group'>";
                put += "<div class='message first'>" + "<div class='username'>" + text[0] + "</div>";
                put += "<div class='message-text'>" + text[1] + "</div></div></div>";
                $(".chat[name='broadcast']").append(put);
            }
            lastPos++;
        }

        $('.chat').scrollTop($('.chat')[0].scrollHeight);
    }, 500);
}

async function updateDirectMessages() {
    setInterval(function() {
        for (let [key, value] of messages) {
            if(key != "broadcast") {
                // Exists DIV with name of user
                if($(".chat[name='" + key + "']").length == 1) {
                    for(var i = value.position; i < value.messages.length; i++) {
                        var text = "";
                        var username = value.messages[i].message.split(";")[1].split(":")[0];
                        var message = value.messages[i].message.split(";")[1].split(":")[1];
                        if(value.messages[i].type == "file") {
                            text = "<a class='file " + MD5(message) + "'>Receiving...</a>";
                        }
                        else if(value.messages[i].type == "text"){
                            text = message;
                        }
                        if($(".chat[name='" + key + "'] .message-group").last().find(".message.first").find(".username").html() == username) {
                            var put = "<div class='message'>";
                            put += "<div class='message-text'>" + text + "</div></div>";
                            $(".chat[name='" + key + "'] .message-group").last().append(put);
                        }
                        else {
                            var put = "<div class='message-group'>";
                            put += "<div class='message first'>" + "<div class='username'>" + username + "</div>";
                            put += "<div class='message-text'>" + text + "</div></div></div>";
                            $(".chat[name='" + key + "']").append(put);
                        }
                        value.position++;
                    }
                }
            }
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

        updateMessagesBroadcast();
        updateDirectMessages();
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
    $("label").css("display", "inline-block");

    $("#sendMsgBtn").attr("name", user);

    $(".chat.active").hide();

    if($(".chat[name='" + user + "']").length == 1) {
        $(".chat[name='" + user + "']").addClass("active");
        $(".chat[name='" + user + "']").show();
    }
    else {
        $("#chatarea").append("<div class='chat active' name='" + user + "'></div>");
    }
}

function goBack() {
    $(".name").html("WebRTC Chat");

    $(".header").css("display", "block");
    $(".header a").css("display", "none");
    $(".name").css("margin-right" ,"");
    $("label").css("display", "none");

    $("#sendMsgBtn").attr("name", "broadcast");

    $(".chat.active").hide();
    $(".chat[name='broadcast']").show();
}

// When user clicks the "send message" button
sendMsgBtn.addEventListener("click", function (event) {
    var val = msgInput.val();
    var file = document.querySelectorAll('.inputfile')[0].files[0];
    var t = new Date();
    var date = t.getDate() + "-" + (t.getMonth()+1) + "-" + t.getFullYear() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds() + ":" + t.getMilliseconds();
    if(val.length > 0) {
        if($("#sendMsgBtn").attr("name") == "broadcast") {
            sendMessage("broadcast", name, date + ";" + name + ": " + val);
        }
        else {
            sendMessage("direct", $("#sendMsgBtn").attr("name"), date + ";" + name + ": " + val);
        }

        msgInput.val('');
    }
    else if(file) {
        var msg = $("#sendMsgBtn").attr("name") + ";" + date + ";" + name + ";" + file.name + ";" + file.size + ";" + file.type;
        sendMessage("file", $("#sendMsgBtn").attr("name"), msg);
        sendFile($("#sendMsgBtn").attr("name"), file);
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
        var file = document.querySelectorAll('.inputfile')[0].files[0];
        var t = new Date();
        var date = t.getDate() + "-" + (t.getMonth()+1) + "-" + t.getFullYear() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds() + ":" + t.getMilliseconds();
        if(val.length > 0) {
            if($("#sendMsgBtn").attr("name") == "broadcast") {
                sendMessage("broadcast", name, date + ";" + name + ": " + val);
            }
            else {
                sendMessage("direct", $("#sendMsgBtn").attr("name"), date + ";" + name + ": " + val);
            }

            msgInput.val('');
        }
        else if(file){
            var msg = $("#sendMsgBtn").attr("name") + ";" + date + ";" + name + ";" + file.name + ";" + file.size + ";" + file.type;
            sendMessage("file", $("#sendMsgBtn").attr("name"), msg);
            sendFile($("#sendMsgBtn").attr("name"), file);
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
