const { SerialPort } = require('serialport');

const port = new SerialPort({
  baudRate: 9600,
  path: '/dev/tty.usbserial-A50285BI',
});

port.on('open', () => {
  console.log('Port open');
});

port.on('data', (data) => {
  // console.log('>', [...data].map(char => Number(char).toString(16)))
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const GET_POSITION = 0x30;
const GET_ANGLE = 0x36;
const GET_ENABLED = 0x3a;
const GET_SERIAL_ENABLED = 0xf3;
const SET_ROTATE = 0xfd;

class Servo {
  id = 0xE0;
  constructor(id) {
    this.id = id;
  }


  async send(...args) {
    const cmd = [this.id, ...args];
    const chk = cmd.reduce((a, b) => a + b);
    // console.log('<', [...cmd, chk].map(char => Number(char).toString(16)))
    port.write([...cmd, 0x00]);
  }

  async read() {
    return new Promise((resolve) => {
      port.once('data', (data) => {
        const id = data[0];
        if (id !== this.id) console.log('ivalid id', id);
        resolve(data.slice(1));
      });
    });
  }

  async getPosition() {
    this.send(GET_POSITION);
    const [p1, p2] = await this.read();
    return (p1 << 8) + p2;
  }

  async checkUartEnabled() {
    port.write([this.id, GET_SERIAL_ENABLED, 0x01]);
    const [enabled] = await this.read();
    return enabled;
  }

  async getAngle() {
    port.write([this.id, GET_ANGLE]);
    const [a, b, c, d] = await this.read();
    return (a << 24) + (b << 16) + (c << 8) + d;
  }

  async rotateMany(speed, position) {

    port.write([this.id, SET_ROTATE, speed, 0xff && (position >> 8), position & 0xff]);
    // e0 fd 86 00 00 0c 80 ef
    // port.write([this.id, SET_ROTATE, 0x86, 0, 0, 0x0c, 0x80, 0xef]);
    return this.read();
  }
}

const ID = 0xE0;
async function main(ms) {
  const s = new Servo(0xE0);

  console.log('pos', await s.getPosition());

  // await delay(1000);

  // port.write([0xE0, 0xfd, 0xf8, 0x7d, 0x00]);
  //  await delay(1000);

  console.log('enabled', await s.checkUartEnabled());
  console.log('angle', await s.getAngle());
  console.log('rotateMany', await s.rotateMany(0xf0, 0x100));

  for (let i = 0; i < 100; i++) {
    console.log(await s.getPosition());
    await delay(500);
  }
}

main();