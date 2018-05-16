// require our websocket library
var WebSocketServer = require('ws').Server;

// creating a websocket server at port 9090
var wss = new WebSocketServer({port: 9090});

// all connected to the server users
var conUsers = new Array();
var conUsers = new Array();

// Verify if a username is available
// 1 if unavailable
// 0 if available
function logged(name) {
    for(i = 0; i < conUsers.length; i++) {
        if(name==conUsers[i].name) {
            return 1;
        }
    }
    return 0;
}

// Return connected users semicolon separated
function getUsersString() {
    var result = "";
    for(i = 0; i < conUsers.length; i++) {
        result += conUsers[i].name+";";
    }
    return result;
}

// Get connection to user
function getConUser(name) {
    var conn = null;
    for(i = 0; i < conUsers.length; i++) {
        if(name==conUsers[i].name) {
            conn = conUsers[i];
            break;
        }
    }
    return conn;
}

// Remove connection to user
function removeUser(name) {
    var user = "";
    for(i = 0; i < conUsers.length; i++) {
        if(name==conUsers[i].name) {
            user = conUsers[i].name;
            break;
        }
    }
    if(user != "") {
        conUsers.splice(i,1);
    }
    return user;
}

// when a user connects to our sever
wss.on('connection', function(connection) {


    console.log("User connected");

    //when server gets a message from a connected user
    connection.on('message', function(message) {

        var data;
        // Accepting only JSON messages
        try {
            data = JSON.parse(message);
        }
        catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        // Switching type of the user message
        switch (data.type) {
            // When a user tries to login
            case "login":
                console.log("User logged", data.name);
                // If anyone is logged in with this username then refuse
                if(logged(data.name)) {
                    sendTo(connection, {
                        type: "login",
                        success: false,
                        users: ""
                    });
                }
                else {
                    // Save user connection on the server
                    var temp = {
                        name: data.name,
                        con: connection
                    };
                    connection.name = data.name;
                    conUsers.push(temp);

                    var us = getUsersString();
                    sendTo(connection, {
                        type: "login",
                        success: true,
                        users: us
                    });
                }
                break;

            case "offer":
                //for ex. UserA wants to call UserB


                //if UserB exists then send him offer details
                var usrObj = getConUser(data.name);

                if(usrObj != null) {
                    //setting that UserA connected with UserB
                    console.log("Sending offer to: ", usrObj.name);
                    sendTo(usrObj.con, {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    });
                }
                break;

            case "answer":

                //for ex. UserB answers UserA
                var usrObj = getConUser(data.name);

                if(usrObj.con != null) {
                    console.log("Sending answer to: ", usrObj.name);
                    sendTo(usrObj.con, {
                        type: "answer",
                        answer: data.answer,
                        name: connection.name
                    });
                }
                break;

            case "candidate":
                console.log("Sending candidate to: ", data.name);
                var usrObj = getConUser(data.name);

                if(usrObj.con != null) {
                    sendTo(usrObj.con, {
                        type: "candidate",
                        candidate: data.candidate,
                        name: connection.name
                    });
                }
                break;

            case "leave":
                console.log("Disconnecting from", data.name);
                removeUser(data.name);
                //notify the other user so he can disconnect his peer connection
                for(i = 0; i < conUsers.length; i++) {
                    if(conUsers[i].con != null) {
                        sendTo(conUsers[i].con, {
                            type: "leave",
                            name: data.name
                        });
                    }
                }
                break;

            case "request_users":
                console.log("Received users request!");
                var usersCon = getUsersString();
                sendTo(connection, {
                    type: "users",
                    users: usersCon
                });
                break;

            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command not found: " + data.type
                });
                break;
        }
    });

   // when user exits, for example closes a browser window
   // this may help if we are still in "offer","answer" or "candidate" state
   connection.on("close", function() {

        if(connection) {
            var user = connection.name;
            removeUser(connection.name);
            console.log("Disconnecting other peers from " + connection.name + "!");

            for(i = 0; i < conUsers.length; i++) {
                if(conUsers[i].con != null) {
                    sendTo(conUsers[i].con, {
                        type: "leave",
                        name: user
                    });
                }
            }
        }
    });

    connection.send(JSON.stringify({type: "hello", msg: "Hello world"}));

});

function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}
