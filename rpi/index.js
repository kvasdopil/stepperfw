const cp = require('child_process');
const app = require('express')();
const static = require('express-static');
const expressWs = require('express-ws')(app);
const fs = require('fs');

const path = fs.readdirSync('/dev/').filter(p => p.startsWith('ttyUSB')).shift();


if (!path) {
  console.log('running without a port');
}

let port = null;
let clients = [];

if (path) {
  console.log('using device /dev/' + path);

  cp.execSync('stty -F /dev/' + path + ' 115200 raw -echo -echoe -echok -echoctl -echoke', { stdio: 'inherit' });

  // port = new SerialPort({
  //   path: `/dev/${path}`,
  //   baudRate: 115200,
  //   dataBits: 8,
  //   parity: 'none',
  //   stopBits: 1,
  // });

  port = fs.createWriteStream(`/dev/${path}`, { flags: 'w' });

  fs.createReadStream(`/dev/${path}`, { flags: 'r' }).on('data', (data) => {
    console.log(`> ${data.toString().trim()}`);
    for (const cli of clients) {
      cli.send(data.toString().trim());
    }
  });
}

const write = (data) => {
  console.log(`< ${data}`);
  if (!port) {
    console.log('(port not open)');
    return;
  }
  return new Promise(resolve => port.write(`${data}; \r\n`, resolve));
}

// async function main() {
//   await new Promise(resolve => setTimeout(resolve, 100));
// //  await write('G91');
// }

// main();


app.use((req, res, next) => {
  console.log(req.url);
  next();
})

app.ws('/ws', (ws, req) => {
  console.log('conn');
  clients.push(ws);
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });

  ws.on('message', (msg) => {
    write(msg);
  });
});

app.use(static('public'));

app.listen(80);

