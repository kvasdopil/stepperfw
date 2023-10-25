const { SerialPort } = require('serialport');

const port = new SerialPort({
  baudRate: 9600,
  path: '/dev/tty.usbserial-A50285BI',
});

port.on('open', () => {
  console.log('Port open');
});

port.on('data', (data) => {
  console.log('>', [...data].map(char => Number(char).toString(16)))
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const GET_POSITION = 0x30;
class Servo {
  id = 0xE0;
  constructor(id) {
    this.id = id;
  }


  async send(...args) {
    const cmd = [this.id, ...args];
    const chk = cmd.reduce((a, b) => a + b);
    console.log('<', [...cmd, chk].map(char => Number(char).toString(16)))
    port.write([...cmd, 0x00]);
  }

  async read() {
    return new Promise((resolve) => {
      port.once('data', (data) => {
        resolve(data);
      });
    });
  }

  async getPosition() {
    this.send(GET_POSITION);
    const [id, p1, p2] = await this.read();
    // console.log(id, p1, p2);
    // console.log('>', [...data].map(char => Number(char).toString(16)))
    if (id !== this.id) console.log('ivalid id', id);

    return (p1 << 8) + p2;
  }

  async checkEnabled() {
    port.write([this.id, 0xF3, 0x01]);
    return this.read();
  }

  async cmd36() {
    port.write([this.id, 0x36]);
    return this.read();
  }

  async rotateMany() {
    port.write([this.id, 0xfd, 0xf8, 0x7d, 0x00]);
    return this.read();
  }
}

const ID = 0xE0;
async function main(ms) {
  const s = new Servo(0xE0);

  console.log(await s.getPosition());

  // await delay(1000);

  // port.write([0xE0, 0xfd, 0xf8, 0x7d, 0x00]);
  //  await delay(1000);

  console.log('enabled', await s.checkEnabled());
  console.log('cmd36', await s.cmd36());
  console.log('rotateMany', await s.rotateMany());

}

main();