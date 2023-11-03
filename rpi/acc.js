const dbus = require('dbus-native');
const yaml = require('yaml');
const bus = dbus.systemBus();

const service = 'org.bluez';
const READ_CHAR = '/org/bluez/hci0/dev_EE_01_91_49_AD_A3/service000b/char000c';
const WRITE_CHAR = '/org/bluez/hci0/dev_EE_01_91_49_AD_A3/service000b/char000f';

const chunks = [];

async function main() {
  const riface = await new Promise((resolve, reject) => bus.getInterface(service, READ_CHAR, "org.bluez.GattCharacteristic1", (err, iface) => err ? reject(err) : resolve(iface)));
  // bus.getInterface(service, READ_CHAR, "org.bluez.GattCharacteristic1", (err, iface) => {
  // if (err) {
  //   console.error(`Error getting interface: ${err.message}`);
  //   return;
  // }
  console.log('Iface ok');
  riface.StartNotify((e, v) => console.log('startn', e, v));
  // });

  bus.getInterface(service, READ_CHAR, 'org.freedesktop.DBus.Properties', (err, iface) => {
    if (err) {
      console.error(`Error getting interface: ${err.message}`);
      return;
    }
    console.log(`Interface obtained`);

    //  iface.StartNotify((e,v) => console.log('start notify', e || 'ok'));

    iface.on('PropertiesChanged', (ifaceName, changedProps, invalidatedProps) => {
      for (const cp of changedProps) {
        const [name, a] = cp;
        if (name === 'Value') {
          //     console.log(a,b)
          const [info, data] = a;
          const chunk = data[0].toString();
          //console.log(data[0], chunk);
          chunks.push(chunk);
          if (!chunk.endsWith("\x0d\x0a\x3e")) return;
          const line = chunks.join('').split("\n").map(a => a.trim());
          const l = line.find(line => line.startsWith('='));
          if (!l) return;
          console.log(yaml.parse(l.substring(1)));
          process.exit(0);
        }
      }
      //    console.log('pc', changedProps);
      //    if (changedProps.Value) {
      //      const value = changedProps.Value;
      //      console.log(`Value changed: ${value.toString('hex')}`);
      //    }
    });

    bus.getInterface(service, WRITE_CHAR, "org.bluez.GattCharacteristic1", (err, iface) => {
      if (err) {
        console.error(`Error getting interface: ${err.message}`);
        return;
      }
      console.log('Iface ok');
      const res = iface.WriteValue(Buffer.from('acc.read();\r\n'), {}, (e, v) => console.log('w', e, v));

    });
  });

}

main();