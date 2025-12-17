const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('Test Relay Server running 8080...');

wss.on('connection', ws => {
    console.log('Client connected!');
    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            console.log('Received Relay Data:');
            console.log('Source:', data.source);
            // console.log('Payload:', data.payload.substring(0, 500)); // Log first 500 chars
            if (data.source === 'fetch' || data.source === 'xhr') {
                console.log('Payload (JSON):', data.payload);
            } else {
                console.log('Payload (WS):', data.payload);
            }
        } catch (e) {
            console.log('Received raw:', message);
        }
    });
});
