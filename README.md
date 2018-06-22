# P2P network between browsers

The main goal of this project is to create an overlay network formed by browsers.

The connection is made with WebRTC with the help of a server only for signaling that is mandatory in WebRTC, for the initial bootstrap and to keep an up to date list of all connected peers for our project. Everything else is browser's duty.

## Application

To test our overlay network we implemented a chat room that allows messages between everyone or a direct message system that allows messaging or file transfer. All this is done without any direct connections if both peers aren't directly connected. All data is routed through the overlay network.

## Signaling

The mentioned signaling is only used when two peers want to establish a connection.
In order to to establish the connection both ends should know that will. To make that happen the signaling server does it's job, deliver the *Offer*.
That *Offer* is an SDP packet that contains all the parameters about the connection that can be established. A peer that receives an *Offer* answers with an *Answer* with the same thing but for his connection.

When an *Answer* arrives the connection between those two peers is established and ready to be used for both data transfer, for audio and/or video transfer or for both.

## API

The file *webrtc.js* provides an API for sending messages or files.

The functions `sendMessage()` and `sendFile()` allow us to send a message or a file between any two peers in the network thanks to a process of *Route Discovery*.

### Messages

They have a specific format that is important to keep so that their processing goes well.

----------
`sendMessage(Type, Destination, Message)`

The field *Type* can be set has `broadcast` or `direct`. The first one sends a message to all peers in the network with controlled flooding. The second one sends a message directly to the peer set in *Destination*.
The field *Message* needs to have the following format:
- `Date;Source;TextMessage`

When sending files it should be sent a message first with the information of the file. The message should have the following format:
- `Destination;Date;Source;FileName;FileSize;FileType`

Keeping this all messages should flow correctly.

--------

`sendFile(Destination, File)`

In this function the only thing to keep in mind is to pass the file from the `<input>` and not the input itself.

----------

It is kept a global `Map messages` that contains all messages sent and received. Doing `messages.get("broadcast")` we get all messages which destination is everyone, `messages.get(User)` gets the messages from the requested *User*. This last one comes in form of a javascript object `{type: Type, message: Msg}`, with Type being either *text* or *file*. Messages of type *text* comes with the format `Date;Username:Message` and the *file* type `Date;Username:FileName`.


## Route Discovery Mechanism

When a peer wants to send a file or a message to another it is verified if a route to that peer is known, using `connections` and `reachable`.

*Connections* keeps all the above for the directly connected peers.

`Connections :: Map`
`Key :: Peer Username (String)`
`Value :: Object {name::String, connection::RTCPeerConnection, channel::RTCDataChannel}`

*Reachable* keeps all level two neighbours (neighbours of directly connected peers) and requested peers. The value is the username of a directly connected peer.

`Reachable :: Map`
`Key :: Destination Peer Username (String)`
`Value :: Neighbour (String)`

If the peer isn't in none of the maps a *RouteRequest* is sent with controlled flooding. The first node to receive the request answers with a *RouteReply* through the same path that the *RouteReply* came, refreshing the *reachable* Map on the way back.

## Requirements

[fif]: https://www.mozilla.org/en-US/firefox/new/
[op]: https://www.opera.com/download
[ch]: https://www.google.com/chrome/index.html
[njs]: https://nodejs.org/en/download/

- [Node.js][njs]
- [Google Chrome][ch], [Opera][op] or [Mozilla Firefox][fif]


## How to install and run

1. Go to folder that contains the files
2. Run `npm install` to install all the dependencies
3. Go to client folder
4. Run `static -a <IP address for webserver> -p <port> &`
5. Return to main folder and execute `node server.js &`
