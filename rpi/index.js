const cp = require('child_process');
const app = require('express')();
const static = require('express-static');
const expressWs = require('express-ws')(app);
const fs = require('fs');
const yaml = require('yaml');
const cors = require('cors');

const acc = require('./acc.js');

const path = fs.readdirSync('/dev/').filter(p => p.startsWith('ttyUSB')).shift();


if (!path) {
  console.log('running without a port');
}

let port = null;
let clients = [];

if (path) {
  console.log('using device /dev/' + path);

  cp.execSync('stty -F /dev/' + path + ' 9600 raw -echo -echoe -echok -echoctl -echoke', { stdio: 'inherit' });

  port = fs.createWriteStream(`/dev/${path}`, { flags: 'w' });

  fs.createReadStream(`/dev/${path}`, { flags: 'r' }).on('data', (data) => {
    console.log('>', data);
    for (const cli of clients) {
      cli.send(data);
    }
  });
}

const write = (data) => {
  console.log(`< ${data}`);
  if (!port) {
    console.log('(port not open)');
    return;
  }
  return new Promise(resolve => port.write(data, resolve));
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

app.use(cors());
app.get('/acc/:mac', async (req, res) => {
  try {
    const mac = req.params.mac;
    const puck = await acc.connect(mac);
    const raw = await puck('acc.read();');
    const parsed = yaml.parse(raw);
    res.json(parsed);
  } catch (e) {
    res.status(500).send(e.toString());
  };
});

app.use(static('public'));

app.listen(80);

