#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws = require("ws");
const rpcServer = require("@sourcegraph/vscode-ws-jsonrpc/lib/server");

let serverPort = 3000;
let languageServers = {
  pythonServer: [ 'pyls' ],
  python3Server: [ 'pyls' ],
  // go: [ '/usr/local/bin/go', 'langserver.go' ],
  cppServer: [ 'clangd', '--all-scopes-completion=true' ],
  cServer: [ 'clangd', '--all-scopes-completion=true' ],
  // ts: [ 'typescript-language-server.cmd', '--stdio' ],
  javaServer: [ '/home/ubuntu/java-language-server/dist/lang_server_linux.sh' ],
  java8Server: [ '/home/ubuntu/java-language-server/dist/lang_server_linux.sh' ]
};

const wss = new ws.Server({
    port: serverPort,
    perMessageDeflate: false
}, () => {
    console.log(`Listening to http and ws requests on ${serverPort}`);
});
function toSocket(webSocket) {
    return {
        send: content => webSocket.send(content),
        onMessage: cb => webSocket.onmessage = event => cb(event.data),
        onError: cb => webSocket.onerror = event => {
            if ('message' in event) {
                cb(event.message);
            }
        },
        onClose: cb => webSocket.onclose = event => cb(event.code, event.reason),
        dispose: () => webSocket.close()
    };
}
wss.on('connection', (client, request) => {
    let langServer;
    Object.keys(languageServers).forEach((key) => {
        if (request.url === '/' + key) {
            langServer = languageServers[key];
        }
    });
    if (!langServer || !langServer.length) {
        console.error('Invalid language server', request.url);
        client.close();
        return;
    }
    let localConnection = rpcServer.createServerProcess('Example', langServer[0], langServer.slice(1));
    let socket = toSocket(client);
    let connection = rpcServer.createWebSocketConnection(socket);
    rpcServer.forward(connection, localConnection);
    console.log(`Forwarding new client`);
    socket.onClose((code, reason) => {
        console.log('Client closed', reason);
        localConnection.dispose();
    });
});
