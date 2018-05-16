# P2P network between browsers

The main goal of this project is to create an overlay network formed by browsers.

The connection is made with WebRTC with the help of a server only for signaling that is mandatory in WebRTC. Everything else is browser's responsability.

## Signaling

A sinalização de que falamos é apenas utilizada para quando dois peers querem establecer uma comunicação entre si.
Para que essa conexão possa ser efetuada é necessário haver conhecimento em ambas as partes. É ai que entra o servidor de sinalização, que está encarregue de fazer a entrega da *Offer*.
Esta *offer* contém todos os detalhes da ligação para que os dois peers a possam establecer. O peer que recebe a *offer* envia depois uma *Answer* com os detalhes da sua ligação.

No momento em que a *answer* chega ao peer que enviou a *offer* a ligação entre os dois browsers está feita e pronta a ser utilizada com um canal de dados ou transmissão de audio e video ou ambos.


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
