const os = require('os');
const WebSocket = require('ws');

const port = 8080;
const wss = new WebSocket.Server({ port });

// Find this laptop's IP address on the WiFi, so the Arduino knows where to connect
function localIP() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const a of addresses) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return 'localhost';
}

wss.on('connection', function connection(ws) {
  console.log('connected');

  ws.on('message', function incoming(message) {
    const text = message.toString();
    console.log('received:', text);

    // Pass the message on to everyone else who is connected
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    });
  });

  ws.on('close', function () {
    console.log('disconnected');
  });
});

console.log(localIP() + ' listening on port', port);