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
var chunkSize = 65535;
const BYTES_PER_CHUNK = 1200;

// Buffer to receive data
var receiveBuffer = [];

// Size of received data
var receivedSize = 0;

// *************
// Aux functions
// *************

// Verify if an object is parsable by JSON
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

// Return a hash of a string
var MD5 = function (string) {

    function RotateLeft(lValue, iShiftBits) {
        return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
    }

    function AddUnsigned(lX,lY) {
        var lX4,lY4,lX8,lY8,lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);

        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }

        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            }
            else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        }
        else {
            return (lResult ^ lX8 ^ lY8);
        }
    }

    function F(x,y,z) { return (x & y) | ((~x) & z); }

    function G(x,y,z) { return (x & z) | (y & (~z)); }

    function H(x,y,z) { return (x ^ y ^ z); }

    function I(x,y,z) { return (y ^ (x | (~z))); }

    function FF(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));

        return AddUnsigned(RotateLeft(a, s), b);
    };

    function GG(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));

        return AddUnsigned(RotateLeft(a, s), b);
    };

    function HH(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));

        return AddUnsigned(RotateLeft(a, s), b);
    };

    function II(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));

        return AddUnsigned(RotateLeft(a, s), b);
    };

    function ConvertToWordArray(string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWords_temp1=lMessageLength + 8;
        var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
        var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
        var lWordArray=Array(lNumberOfWords-1);
        var lBytePosition = 0;
        var lByteCount = 0;

        while ( lByteCount < lMessageLength ) {
            lWordCount = (lByteCount-(lByteCount % 4))/4;
            lBytePosition = (lByteCount % 4)*8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount-(lByteCount % 4))/4;
        lBytePosition = (lByteCount % 4)*8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
        lWordArray[lNumberOfWords-2] = lMessageLength<<3;
        lWordArray[lNumberOfWords-1] = lMessageLength>>>29;

        return lWordArray;
    };

    function WordToHex(lValue) {
        var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;

        for (lCount = 0;lCount<=3;lCount++) {
            lByte = (lValue>>>(lCount*8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
        }
        return WordToHexValue;
    };

    function Utf8Encode(string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    };

    var x=Array();
    var k,AA,BB,CC,DD,a,b,c,d;
    var S11=7, S12=12, S13=17, S14=22;
    var S21=5, S22=9 , S23=14, S24=20;
    var S31=4, S32=11, S33=16, S34=23;
    var S41=6, S42=10, S43=15, S44=21;
    string = Utf8Encode(string);
    x = ConvertToWordArray(string);
    a = 0x67452301;
    b = 0xEFCDAB89;
    c = 0x98BADCFE;
    d = 0x10325476;

    for (k=0;k<x.length;k+=16) {
        AA=a; BB=b; CC=c; DD=d;
        a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
        d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
        c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
        b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
        a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
        d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
        c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
        b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
        a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
        d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
        c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
        b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
        a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
        d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
        c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
        b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
        a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
        d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
        c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
        b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
        a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
        d=GG(d,a,b,c,x[k+10],S22,0x2441453);
        c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
        b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
        a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
        d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
        c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
        b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
        a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
        d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
        c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
        b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
        a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
        d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
        c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
        b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
        a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
        d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
        c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
        b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
        a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
        d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
        c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
        b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
        a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
        d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
        c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
        b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
        a=II(a,b,c,d,x[k+0], S41,0xF4292244);
        d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
        c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
        b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
        a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
        d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
        c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
        b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
        a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
        d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
        c=II(c,d,a,b,x[k+6], S43,0xA3014314);
        b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
        a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
        d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
        c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
        b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
        a=AddUnsigned(a,AA);
        b=AddUnsigned(b,BB);
        c=AddUnsigned(c,CC);
        d=AddUnsigned(d,DD);
    }

    var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);

    return temp.toLowerCase();
}

// Create promise to sleep for ms miliseconds
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ***************
// WebRTC dinamics
// ***************

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
var conn = new WebSocket('ws://192.168.43.247:9090');

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
            var split = data.message.split(";");
            fileName = split[3];
            fileType = split[5];
            fileSize = split[4];
            fileSrc = split[2];
            fileDst = split[0];
            fileDate = split[1];
            handleDirectMessage(data.source, data.destination, data.message);
        }
    }
    else {
        receiveBuffer.push(event.data);
        receivedSize += event.data.byteLength;

        if (receivedSize == fileSize) {
            var received = new window.Blob(receiveBuffer);
            console.log("All received");
            handleFile(received, fileDate, fileName, fileType, fileSize, fileSrc, fileDst);
        }
    }
}

async function handleFile(buffer, date, fName, type, size, src, dst) {
    console.log(name + " - " + fileDst);
    if(dst==name) {
        console.log("Yup");
        receiveBuffer = [];
        receivedSize = 0;

        var href = URL.createObjectURL(buffer);
        var download = fName;
        var textContent = fName;
        var hash = MD5(fName);

        console.log($('.' + hash).length);
        var trys = 0;
        while($('.' + hash).length == 0 && trys < 30) {
            await sleep(1000);
            trys++;
        }
        $('.' + hash).attr('href', href);
        $('.' + hash).attr('download', download);
        if(trys >= 30) {
            $('.' + hash).html("Error downloading file!");
        }
        else {
            $('.' + hash).html(textContent);
        }

        fileName = "";
        fileType = "";
        fileSize = "";
        fileSrc = "";
        fileDst = "";
        fileDate = "";
    }
    else {
        var msg = dst + ";" + date + ";" + src + ";" + fName + ";" + size + ";" + type;
        handleDirectMessage("file", dst, msg);
        sendFile(dst, buffer);
        fileName = "";
        fileType = "";
        fileSize = "";
        fileSrc = "";
        fileDst = "";
        fileDate = "";
    }
}

// Handles a reply for a route request
// src -> Neighbour that sent the reply
// dest -> Initial destination
function handleReplyRoute(snd, src, dest) {
    var next;
    if(reachable.has(dest) && typeof reachable.get(dest) == "object") {
        if(reachable.get(dest).time == -1) {
            console.log("Updated Reachable " + snd);
            var t = new Date();
            next = reachable.get(dest).destination;
            // Update reachable table
            reachable.set(dest, {destination: snd, time: t.getTime()});
            if(next != "") {
                send({
                    type: "reply",
                    sender: name,
                    source: src,
                    destination: dest
                }, next);
            }
        }
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
        var split = msg.split(";");
        var msgFinal = split[1] + ";" + split[2] + ":" + split[3];
        if(messages.has(src)) {
            if(msg.split(";").length <= 2) {
                messages.get(src).messages.push({type:"text", message: msg});
            }
            else {
                messages.get(src).messages.push({type:"file", message: msgFinal});
            }
        }
        else {
            if(msg.split(";").length <= 2) {
                messages.set(src, {position: 0, messages: [{type:"text", message: msg}]});
            }
            else {
                messages.set(src, {position: 0, messages: [{type:"file", message: msgFinal}]});
            }
        }
    }
    else {
        var split = msg.split(";");
        var temp = {
            type: "direct",
            source: src,
            destination: dest,
            message: msg
        }
        if(split.length > 2) {
            temp.type = "file";
        }
        if(connections.has(dest)) {
            console.log("Destination: " + dest + " Sent: " + msg);
            connections.get(dest).channel.send(JSON.stringify(temp));
        }
        else if(reachable.has(dest)) {
            var obj = reachable.get(dest);
            // If the entry on reachable is object means that it was added by a reply to a route request
            if(typeof obj == "object") {
                var t = new Date();
                var trys = 0;
                // If entry is more than 5 minutes old it gets refreshed
                if(obj.time != -1 && (t.getTime() - obj.time) > 300000) {
                    reachable.set(dest, {destination: "", time: -1});
                    var tempReq = {
                        type: "request",
                        sender: name,
                        source: name,
                        destination: dest
                    };
                    for(var con of connections.values()){
                        con.channel.send(JSON.stringify(tempReq));
                    }
                    while(reachable.get(dest).time == -1 && trys < 18) {
                        await sleep(500);
                        trys++;
                    }
                    if(trys < 18) {
                        console.log("Destination: " + connections.get(reachable.get(dest).destination).name + " Sent: " + msg);
                        connections.get(reachable.get(dest).destination).channel.send(JSON.stringify(temp));
                    }
                }
                else if(obj.time == -1) {
                    while(reachable.get(dest).time == -1 && trys < 18) {
                        await sleep(500);
                        trys++;
                    }
                    if(trys < 18) {
                        console.log("Destination: " + connections.get(reachable.get(dest).destination).name + " Sent: " + msg);
                        connections.get(reachable.get(dest).destination).channel.send(JSON.stringify(temp));
                    }
                }
                else {
                    console.log("Destination: " + connections.get(obj.destination).name + " Sent: " + msg);
                    connections.get(obj.destination).channel.send(JSON.stringify(temp));
                }
            }
            else {
                console.log("Destination: " + obj + " Sent: " + msg);
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
            while(reachable.get(dest).time == -1 && trys < 18) {
                await sleep(500);
                trys++;
            }
            if(trys < 18) {
                console.log("Destination: " + connections.get(reachable.get(dest).destination).name + " Sent: " + msg);
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
        $('title').html(name); // apagar
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
            conObj.channel = conObj.connection.createDataChannel("channel1", {ordered: true, reliable:false});

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

    // var newOffer;
    // console.log("print offer");
    // console.log(offer.sdp);
    // var split = offer.sdp.split("b=AS:30");
    // if(split.length > 1) {
    //     offer.sdp = split[0] + "b=AS:1638400" + split[1];
    // }
    // else {
    //     offer.sdp = offer.sdp;
    // }

    conObj.connection.setRemoteDescription(new RTCSessionDescription(offer));

    // Creating dataChannel
    conObj.channel = conObj.connection.createDataChannel("channel1", {ordered:true, reliable: false});

    conObj.channel.onmessage = handleClientMessage;
    conObj.channel.onclose = handleChannelClose;
    conObj.channel.onerror = handleChannelError;

    //create an answer to an offer
    console.log("Sending answer to " + conObj.name);
    conObj.connection.createAnswer(function (answer) {
        var newAnswer;

        // var split = answer.sdp.split("b=AS:30");
        // if(split.length > 1) {
        //     answer.sdp = split[0] + "b=AS:1638400" + split[1];
        // }
        // else {
        //     answer.sdp = answer.sdp;
        // }
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
        var newAnswer;

        // var split = answer.sdp.split("b=AS:30");
        // if(split.length > 1) {
        //     answer.sdp = split[0] + "b=AS:1638400" + split[1];
        // }
        // else {
        //     answer.sdp = answer.sdp;
        // }

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
        console.log(msg);
        var split = msg.split(";");
        var msgFinal = split[1] + ";" + split[2] + ":" + split[3];
        if(messages.has(dest)) {
            messages.get(dest).messages.push({type:"file", message: msgFinal});
        }
        else {
            messages.set(dest, {position: 0, messages: [{type:"file", message: msgFinal}]});
        }
        handleDirectMessage(name, dest, msg);
    }
}


function readNextChunk(fileReader, file, currentChunk) {
    var start = BYTES_PER_CHUNK * currentChunk;
    var end = Math.min( file.size, start + BYTES_PER_CHUNK );
    fileReader.readAsArrayBuffer( file.slice( start, end ) );
}


async function sendFile(dst, file) {
    // Don't remove this line
    // This allows handleDirectMessage to create an entry in reachable Map
    // if necessary
    await sleep(900);
    console.log("Entrou sendfile");
    console.log("Destination: " + dst);
    var channel = 1;
    if(connections.has(dst)) {
        console.log("Nas connections");
        console.log("file to: " + connections.get(dst).name);
        channel = connections.get(dst).channel;
    }
    else if(reachable.has(dst)) {
        console.log("No reachable");
        var obj = reachable.get(dst);
        // If the entry on reachable is object means that it was added by a reply to a route request
        if(typeof obj == "object") {
            var trys = 0;
            while(reachable.get(dst).time == -1 && trys < 4) {
                await sleep(3000);
                trys++;
            }
            if(trys < 4) {
                channel = connections.get(reachable.get(dst).destination).channel
                console.log("file to: " + connections.get(reachable.get(dst).destination).name);
            }
        }
        else {
            console.log("file to: " + connections.get(reachable.get(dst)).name);
            channel = connections.get(reachable.get(dst)).channel
        }
    }
    if(channel!==1) {
        var fileReader = new window.FileReader();
        var currentChunk = 0;
        console.log("vai enviar");
        fileReader.onload = function() {
            channel.send( fileReader.result );
            currentChunk++;

            if( BYTES_PER_CHUNK * currentChunk < file.size ) {
                readNextChunk(fileReader, file, currentChunk);
            }
        };
        readNextChunk(fileReader, file, currentChunk);
    }
}
