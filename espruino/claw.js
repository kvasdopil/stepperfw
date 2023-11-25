const ssid = '';
const password = '';

var wifi = require('Wifi');
wifi.connect(ssid, { password: password }, function () {
  console.log('Connected to Wifi.  IP address is:', wifi.getIP().ip);
  wifi.save(); // Next reboot will auto-connect
});

const CLAW_PIN = D2;

const set = n => analogWrite(CLAW_PIN, n / 1000, { freq: 50 });

let isOpen = true;
const open = () => set(20);
const close = () => set(125);
open();

const CORS = {
  'Content-Type': 'text/plain',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
}
function pageRequest(req, res) {
  if (req.method === "GET" && req.url === "/open") {
    open();
    isOpen = true;
  }
  if (req.method === "GET" && req.url === "/close") {
    close();
    isOpen = false;
  }
  res.writeHead(200, CORS);
  res.end(`{"open":${isOpen}}`);
}
require("http").createServer(pageRequest).listen(80);