const { useState, useEffect } = React;

const host = window.location.hostname === 'localhost' ? 'robotarm.local' : window.location.host;

const ws = new WebSocket(`ws://${host}/ws`);

ws.onerror = () => {
  console.log('error');
}

const ACC_W = 'EE:01:91:49:AD:A3';
const ACC_Y = 'E2:84:F1:3D:EC:DD';

function yprl(a) {
  const x = a.x;
  const y = a.y;
  const z = a.z;

  // Calculate the length
  const length = Math.sqrt(x * x + y * y + z * z);

  // Calculate the pitch angle (in degrees)
  const pitchRad = Math.atan2(-z, y);
  const pitchDeg = (180 / Math.PI) * pitchRad;

  // Calculate the yaw angle (in degrees)
  const yawRad = Math.atan2(y, x);
  const yawDeg = (180 / Math.PI) * yawRad;

  // Calculate the roll angle (in degrees)
  const rollRad = Math.atan2(y, z);
  const rollDeg = (180 / Math.PI) * rollRad;

  return {
    len: length,
    pitch: pitchDeg,
    yaw: yawDeg,
    roll: rollDeg,
  };
}

const acc = async (mac) => {
  try {
    const res = await fetch(`http://${host}/acc/${mac}`, {
      method: 'GET',
    });
    return res.json();
  } catch (e) {
    console.error(e);
  }
}

const monitorAcc = async (mac, cb) => {
  while (true) {
    await delay(1000);
    const res = await acc(mac);
    if (res && res.x !== undefined && res.y !== undefined && res.z !== undefined) cb(res);
  }
}

const servo = async (msg) => {
  try {
    const res = await fetch('http://servos.local', {
      method: 'POST',
      body: JSON.stringify(msg),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.json();
  } catch (e) {
    console.error(e);
  }
}

const send = (msg) => {
  // console.log('>', msg);
  if (msg instanceof Array)
    ws.send(new Uint8Array(msg));
  else
    ws.send(msg);
}

const Placeholder = () => <div style={{ display: 'inline-block', width: 100 }} />;
const Btn = ({ children, ...rest }) => <button style={{ width: 100, height: 100 }} {...rest}>{children}</button>;

const accel = 3000;
const speed = 6000;

// const GET_ENCODER = 0x30;
// const GET_ANGLE = 0x36;
const GET_PULSES = 0x33;
// const GET_ENABLED = 0x3a;
const GET_SERIAL_ENABLED = 0xf3;
const ROTATE = 0xfd;
const STOP = 0xf7;
// const SET_ACCEL = 0xa4; // 00 80 04

const msgQueue = [];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let locked = false;
const lock = async () => {
  while (locked) await delay(100);
  locked = true;
}
const unlock = () => {
  locked = false;
}

const checkUartEnabled = async (id) => {
  await lock();
  send([0xe0 + id, GET_SERIAL_ENABLED, 0x01]);
  const [res] = await read(id, 1);
  unlock();
  return res === 1;
}

const getPulses = async (id) => {
  await lock();
  send([0xe0 + id, GET_PULSES]);
  const [a, b, c, d] = await read(id, 4);
  unlock();
  return (a << 24) + (b << 16) + (c << 8) + d;
}

// const getEncoder = async (id) => {
//   await lock();
//   send([0xe0 + id, GET_ENCODER]);
//   const [c, d] = await read(id, 2);
//   unlock();
//   return ((c << 8) + d) / 65536 * 360;
// }

// const getPosition = async (id) => {
//   await lock();
//   send([0xe0 + id, GET_ANGLE]);
//   const [a, b, c, d] = await read(id, 4);
//   unlock();
//   // console.log(a, b, c, d);
//   return ((a << 24) + (b << 16) + (c << 8) + d) / 65536 * 360;
// }

// const setAccel = async (id, accel) => {
//   await lock();
//   send([0xe0 + id, SET_ACCEL, (accel >> 8) & 0xff, accel & 0xff]);
//   const [ok] = await read(id, 1);
//   unlock();
//   return ok === 1;
// }

const stop = async (id) => {
  await lock();
  send([0xe0 + id, STOP]);
  await read(id, 1);
  unlock();
}

const monitorServos = async (cb) => {
  let prevx = null;
  let prevy = null;
  while (true) {
    await delay(200);
    try {
      const res = await fetch('http://servos.local');
      const { x, y } = await res.json();

      if (x !== prevx || y !== prevy) {
        // console.log('axis', id, angle);
        cb(x / 40000 * 360, y / 40000 * 360);
        prevx = x;
        prevy = y;
      }
    } catch (e) {
      console.error(e);
      await delay(1000);
    }
  }
}

const monitorAxis = async (id, cb) => {
  let prev = null;
  while (true) {
    await delay(200);
    try {
      const angle = await getPulses(id);

      if (angle !== prev) {
        // console.log('axis', id, angle);
        cb(angle / PULSES_PER_ROTATION * 360, id);
        prev = angle;
      }
    } catch (e) {
      console.error(e);
      await delay(1000);
    }
  }
}

const read = async (id, numBytes) => {
  const abort = () => {
    while (msgQueue.length) msgQueue.shift();
    throw new Error('timeout');
  }
  const t = setTimeout(abort, 3000);
  const [rid, ...res] = await new Promise(resolve => msgQueue.push([numBytes + 1, resolve]));
  clearTimeout(t);
  if (rid !== 0xe0 + id) throw new Error('invalid id');
  return res;
}

const PULSES_PER_ROTATION = 200 * 16 * 37;// 200 * 16 * 25;

// max speeed = 0x7f aka 127
const rotate = async (id, speed, position) => {
  let pos = Math.abs(Math.round(position * PULSES_PER_ROTATION / 360));
  let ok = 0;
  const signBit = (position > 0) ? 0b10000000 : 0;
  await lock();
  while (pos > 0) {
    const p = pos > 0xffff ? 0xffff : pos;
    pos -= p;
    console.log('rotate', pos, id, signBit, speed, p & 0xff, p >> 8);
    send([
      0xe0 + id,
      ROTATE,
      signBit + speed,
      0xff && (p >> 8), p & 0xff
    ]);
    const [lastok] = await read(id, 1);
    ok = lastok;
  }
  unlock();
  return ok === 1;
}

let lastX = null;
const moveW = async (x) => {
  const axis = 1;
  if (lastX === null) lastX = (await getPulses(axis)) / PULSES_PER_ROTATION * 360;
  const delta = x - lastX;
  await rotate(axis, 120, delta);
  lastX = x;
  await rotate(0, 120, delta);
  lastY += delta;
}
let lastY = null;
const moveY = async (y) => {
  // y = -y;
  const axis = 0;
  if (lastY === null) lastY = ((await getPulses(axis)) / PULSES_PER_ROTATION * 360);
  await rotate(axis, 120, y - lastY);
  lastY = y;
}

const moveX = async (w) => {
  servo({ y: Math.round(w / 360 * 40000) });
}

const moveR = async (r) => {
  servo({ x: Math.round(r / 360 * 40000) });
}

const App = () => {
  const [xPos, setXPos] = useState(0);
  const [yPos, setYPos] = useState(0);
  const [rPos, setRPos] = useState(0);
  const [wPos, setWPos] = useState(0);
  const [connected, setConnected] = useState(ws.readyState === 1);
  const [accY, setAccY] = useState(0);
  const [accW, setAccW] = useState(0);

  useEffect(() => {
    const onClose = () => {
      setConnected(false);
    }
    const onOpen = async () => {
      setConnected(true);

      if (await checkUartEnabled(0)) {
        monitorAxis(0, (angle) => {
          setYPos(angle);
        });
      }

      if (await checkUartEnabled(1)) {
        monitorAxis(1, (angle) => {
          setWPos(angle);
        });
      }

      monitorServos((r, x) => {
        setXPos(x - offX);
        setRPos(r - offR);
      });

      // monitorAcc(ACC_Y, val => {
      //   setAccY(val);
      // });

      // monitorAcc(ACC_W, val => {
      //   setAccW(val);
      // });

      // send("X?");
      // send("Y?");
    }
    let buffer = [];
    const onMessage = async (msg) => {
      const data = msg.data instanceof Blob ? Array.from(new Uint8Array(await msg.data.arrayBuffer())) : msg.data;

      while (data.length > 0) {
        buffer.push(data.shift());
      }

      if (msgQueue.length === 0) {
        console.log('< (ignored)', msg.data);
        return;
      }

      const [numBytes, resolve] = msgQueue[0];
      if (buffer.length >= numBytes) {
        const buf = buffer.slice(0, numBytes);
        buffer = buffer.slice(numBytes);
        resolve(buf);
        msgQueue.shift();
      }
    }
    ws.addEventListener('close', onClose);
    ws.addEventListener('open', onOpen);
    ws.addEventListener('message', onMessage);
    () => {
      ws.removeEventListener('close', onClose);
      ws.removeEventListener('open', onOpen);
      ws.removeEventListener('message', onMessage);
    }
  }, [setXPos, setYPos, setConnected]);

  const [tgtX, setTgtX] = useState(null);
  const [tgtY, setTgtY] = useState(null);
  const [tgtR, setTgtR] = useState(null);
  const [tgtW, setTgtW] = useState(null);

  const [offX, setOffX] = useState(0);
  const [offR, setOffR] = useState(0);
  const [offY, setOffY] = useState(0);
  const [offW, setOffW] = useState(0);

  const stopClick = async () => {
    fetch('http://servos.local/stop').catch(e => console.error(e));
    await stop(0);
    await stop(1);
    lastX = null;
    lastY = null;
  }

  const zeroClick = async () => {
    setOffR(rPos);
    setOffX(xPos);
    setOffW(wPos);
    setOffY(yPos);
    setTgtR(rPos);
    setTgtX(xPos);
    setTgtW(wPos);
    setTgtY(yPos);
  };

  const homeClick = async () => {
    const Y = await acc(ACC_Y);
    const W = await acc(ACC_W);
    const aY = yprl(Y).yaw + 90;
    const aW = yprl(W).yaw + 90;
    setAccY(aY);
    setAccW(aW);

    console.log('acc', aW);

    const diff = aW - wPos;
    console.log('diff', diff);

    // reset target, and set offset to current position
    setTgtW(wPos - aW);
    setOffW(wPos - aW);

    setTimeout(() => {
      console.log('move', wPos);
      moveW(wPos - aW);
    }, 300);
  };

  const updateAccW = async () => {
    try {
      const aW = await acc(ACC_W);
      console.log('aw', aW);
      if (aW) setAccW(yprl(aW).yaw + 90);
    } catch (e) {
      console.log(e);
    }
  }

  const updateAccY = async () => {
    try {
      const aY = await acc(ACC_Y);
      console.log('ay', aY);
      if (aY) setAccY(yprl(aY).yaw + 90);
    } catch (e) {
      console.log(e);
    }
  }

  const W = wPos - offW;

  return (
    <div>
      <div style={{ display: "flex" }}>
        <GaugeRound connected={connected} target={tgtX - offX} value={xPos - offX} onChange={pos => setTgtX(pos + offX)} onMove={pos => moveX(pos + offX)} />
        <GaugeRound inverse connected={connected} target={tgtW - offW} value={W} onChange={pos => setTgtW(pos + offW)} onMove={pos => moveW(pos + offW)} />
        <GaugeRound connected={connected} target={W + tgtY - offY} value={W + yPos - offY} onChange={pos => setTgtY(pos + offY - W)} onMove={pos => moveY(pos + offY - W)} />
        <GaugeRound connected={connected} target={tgtR - offR} value={rPos - offR} onChange={pos => setTgtR(pos + offR)} onMove={pos => moveR(pos + offR)} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {connected && <Button title="STOP" color="#f33" onClick={stopClick} />}
          {connected && <Button title="zero" color="#ccc" onClick={zeroClick} />}
          {connected && <Button title="HOME" color="#ccc" onClick={homeClick} />}
        </div>
      </div>
      {<div>
        <GaugeRound connected target={null} value={accW} onChange={updateAccW} onMove={() => { }} />
        <GaugeRound connected target={null} value={accY} onChange={updateAccY} onMove={() => { }} />
      </div>}
    </div>
  );
};

ReactDOM.render(
  <App />,
  document.getElementById('root')
);