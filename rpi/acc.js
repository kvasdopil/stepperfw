const dbus = require('dbus-native');
const EventEmitter = require('events');

const bus = dbus.systemBus();
const service = 'org.bluez';

const init = async (mac) => {
  const id = mac.replace(/:/g, "_").toUpperCase();
  const READ_CHAR = `/org/bluez/hci0/dev_${id}/service000b/char000c`;
  const WRITE_CHAR = `/org/bluez/hci0/dev_${id}/service000b/char000f`;

  const riface = await new Promise((resolve, reject) => bus.getInterface(service, READ_CHAR, "org.bluez.GattCharacteristic1", (err, iface) => err ? reject(err) : resolve(iface)));
  const wiface = await new Promise((resolve, reject) => bus.getInterface(service, WRITE_CHAR, "org.bluez.GattCharacteristic1", (err, iface) => err ? reject(err) : resolve(iface)));
  const notify = await new Promise((resolve, reject) => bus.getInterface(service, READ_CHAR, "org.freedesktop.DBus.Properties", (err, iface) => err ? reject(err) : resolve(iface)));

  riface.StartNotify(); // (e, v) => console.log('startn', e, v));

  const reader = new EventEmitter();
  const chunks = [];
  const handler = (ifaceName, changedProps, invalidatedProps) => {
    for (const cp of changedProps) {
      const [name, a] = cp;
      if (name !== 'Value') return;
      const [info, data] = a;
      const chunk = data[0].toString();

      console.log('ACC:', chunk);
      chunks.push(chunk);
      if (!chunk.endsWith("\x0d\x0a\x3e")) return;
      const line = chunks.join('').split("\n").map(a => a.trim());
      const l = line.find(line => line.startsWith('='));
      if (!l) return;
      reader.emit('data', l.substring(1));
    }
  };
  notify.on('PropertiesChanged', handler);

  const write = (data) => new Promise((resolve, reject) => wiface.WriteValue(data, {}, (e) => e ? reject(e) : resolve()));

  return (data) => new Promise(resolve => {
    reader.once('data', resolve);
    write(Buffer.from(data + '\r\n'));
  });
}

const cache = {};
async function connect(mac) {
  if (cache[mac]) return cache[mac];
  return await init(mac);
}

module.exports = {
  connect,
};