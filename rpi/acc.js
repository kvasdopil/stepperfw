const dbus = require('dbus-native');
const yaml = require('yaml');
const bus = dbus.systemBus();

const service = 'org.bluez';
const READ_CHAR = '/org/bluez/hci0/dev_EE_01_91_49_AD_A3/service000b/char000c';
const WRITE_CHAR = '/org/bluez/hci0/dev_EE_01_91_49_AD_A3/service000b/char000f';

const chunks = [];

async function main() {
  const riface = await new Promise((resolve, reject) => bus.getInterface(service, READ_CHAR, "org.bluez.GattCharacteristic1", (err, iface) => err ? reject(err) : resolve(iface)));
  riface.StartNotify((e, v) => console.log('startn', e, v));

  const notify = await new Promise((resolve, reject) => bus.getInterface(service, READ_CHAR, "org.freedesktop.DBus.Properties", (err, iface) => err ? reject(err) : resolve(iface)));
  const result = new Promise(resolve => {
    notify.on('PropertiesChanged', (ifaceName, changedProps, invalidatedProps) => {
      for (const cp of changedProps) {
        const [name, a] = cp;
        if (name !== 'Value') return;
        const [info, data] = a;
        const chunk = data[0].toString();

        chunks.push(chunk);
        if (!chunk.endsWith("\x0d\x0a\x3e")) return;
        const line = chunks.join('').split("\n").map(a => a.trim());
        const l = line.find(line => line.startsWith('='));
        if (!l) return;
        resolve(l);
      }
    });
  });

  const wiface = await new Promise((resolve, reject) => bus.getInterface(service, WRITE_CHAR, "org.bluez.GattCharacteristic1", (err, iface) => err ? reject(err) : resolve(iface)));
  await new Promise((resolve, reject) => wiface.WriteValue(Buffer.from('acc.read();\r\n'), {}, (e) => e ? reject(e) : resolve()));

  const res = await result;
  console.log(yaml.parse(res.substring(1)));
  process.exit(0);
}

main();