const { useState, useEffect } = React;

const host = window.location.hostname === 'localhost' ? 'robotarm.local' : window.location.host;

const ws = new WebSocket(`ws://${host}/ws`);

ws.onerror = () => {
  console.log('error');
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

const GET_ENCODER = 0x30;
const GET_ANGLE = 0x36;
const GET_PULSES = 0x33;
const GET_ENABLED = 0x3a;
const GET_SERIAL_ENABLED = 0xf3;
const SET_ROTATE = 0xfd;

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

const getEncoder = async (id) => {
  await lock();
  send([0xe0 + id, GET_ENCODER]);
  const [c, d] = await read(id, 2);
  unlock();
  return ((c << 8) + d) / 65536 * 360;
}

const getPosition = async (id) => {
  await lock();
  send([0xe0 + id, GET_ANGLE]);
  const [a, b, c, d] = await read(id, 4);
  unlock();
  // console.log(a, b, c, d);
  return ((a << 24) + (b << 16) + (c << 8) + d) / 65536 * 360;
}

const monitorAxis = async (id, cb) => {
  let prev = null;
  while (true) {
    await delay(300);
    try {
      const angle = await getPulses(id);

      if (angle !== prev) {
        // console.log('axis', id, angle);
        cb(angle / 80000 * 360, id);
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
  const t = setTimeout(abort, 1000);
  const [rid, ...res] = await new Promise(resolve => msgQueue.push([numBytes + 1, resolve]));
  clearTimeout(t);
  if (rid !== 0xe0 + id) throw new Error('invalid id');
  return res;
}

// max speeed = 0x7f aka 127
const rotate = async (id, speed, position) => {
  let pos = Math.abs(position * 80000 / 360);
  let ok = 0;
  const signBit = (position > 0) ? 0b10000000 : 0;
  await lock();
  while (pos > 0) {
    const p = pos > 0xffff ? 0xffff : pos;
    pos -= p;
    // console.log('rotate', pos, id, signBit, speed, p & 0xff, p >> 8);
    send([
      0xe0 + id,
      SET_ROTATE,
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
const moveX = async (x) => {
  const axis = 1;
  if (lastX === null) lastX = await getPosition(axis);
  await rotate(axis, 100, x - lastX);
  lastX = x;
  // send("XP40000");
  // send("YP40000");
  // send(`XS${speed}`);
  // send(`XA${accel}`);
  // send(`YS${speed}`);
  // send(`YA${accel}`);
  // send(`X=${x}`);
}
let lastY = null;
const moveY = async (y) => {
  const axis = 0;
  if (lastY === null) lastY = await getPosition(axis);
  await rotate(axis, 100, y - lastY);
  lastY = y;
  // send("XP40000");
  // send("YP40000");
  // send(`XS${speed}`);
  // send(`XA${accel}`);
  // send(`YS${speed}`);
  // send(`YA${accel}`);
  // send(`Y=${y}`);
}

// let lastX = null;
// const moveXY = async (x, y) => {
//   if (lastX === null) lastX = await getPosition(1);
// }

// let lastX = 0;
// let lastY = 0;

const App = () => {
  const [xPos, setXPos] = useState(0);
  const [yPos, setYPos] = useState(0);
  const [connected, setConnected] = useState(ws.readyState === 1);

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
          setXPos(angle);
        });
      }
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

  const setRot = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const dx = (e.clientX - left) / width - 0.5;
    const dy = (e.clientY - top) / height - 0.5;
    const angle = 90 + Math.atan2(dy, dx) * 180 / Math.PI;
    setTgtX(angle);
    return angle;
  }

  const setElev = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const dy = (e.clientY - top) / height - 0.5;
    setTgtY(190 * dy);
    return 190 * dy;
  }

  const onCircleMove = (e) => {
    if (e.buttons === 0) return;
    setRot(e);
  }


  const onCircleClick = (e) => {
    const a = setRot(e);
    moveX(a);
  }

  const onRectMove = (e) => {
    if (e.buttons === 0) return;
    setElev(e);
  }

  const onRectClick = (e) => {
    const a = setElev(e);
    moveY(a);
  }

  return (
    <div>
      <div>{connected ? 'Connected' : 'Not connected'}</div>
      {/* <div >
        <div >
          <Btn disabled={!connected} onClick={() => moveXY(+mul, -mul)}>X+ Y-</Btn>
          <Btn disabled={!connected} onClick={() => moveX(+mul)}>X+</Btn>
          <Btn disabled={!connected} onClick={() => moveXY(+mul, +mul)}>X+ Y+</Btn>
        </div>
        <div >
          <Btn disabled={!connected} onClick={() => moveY(-mul)}>Y-</Btn>
          <Btn disabled={!connected} onClick={() => toggleMul()}>{mul}</Btn>
          <Btn disabled={!connected} onClick={() => moveY(mul)}>Y+</Btn>
        </div>
        <div>
          <Btn disabled={!connected} onClick={() => moveXY(-mul, -mul)}>X- Y-</Btn>
          <Btn disabled={!connected} onClick={() => moveX(-mul)}>X-</Btn>
          <Btn disabled={!connected} onClick={() => moveXY(-mul, mul)}>X- Y+</Btn>
        </div>
      </div> */}
      <div display="flex">
        <svg width="300" height="300" viewBox="0 0 100 100" >
          <circle cx="50" cy="50" r="50" fill="#ccc" />
          <g style={{ transformOrigin: '50% 50%', transform: `rotate(${xPos}deg)` }}>
            <line x1="45" y1="10" x2="50" y2="1" stroke="#000" />
            <line x1="55" y1="10" x2="50" y2="1" stroke="#000" />
          </g>
          {tgtX !== null && <g style={{ transformOrigin: '50% 50%', transform: `rotate(${tgtX}deg)` }}>
            <line x1="45" y1="15" x2="50" y2="6" stroke="#0c3" />
            <line x1="55" y1="15" x2="50" y2="6" stroke="#0c3" />
          </g>}
          {connected && tgtX !== null && <text x={50} y={50} fill="#0c3" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{tgtX.toFixed(2)}</text>}
          {connected && <text x={50} y={60} fill="#000" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{xPos.toFixed(2)}</text>}
          {connected && <rect x="0" y="0" width="100" height="100" fill="transparent" stroke="transparent" onClick={onCircleClick} onMouseMove={onCircleMove} />}
          {!connected && <text x={50} y={55} fill="#f33" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>NO CONNECTION</text>}
        </svg>
        <svg width="200" height="300" viewBox="0 0 60 100" >
          <rect x="0" y="0" width="200" height="300" fill="#ccc" />
          {tgtY !== null && <g style={{ transformOrigin: '0% 50%', transform: `translateY(${tgtY * 0.52}px)` }}>
            <line x1="4" y1="50" x2="9" y2="45" stroke="#0c3" />
            <line x1="4" y1="50" x2="9" y2="55" stroke="#0c3" />
          </g>}
          <g style={{ transformOrigin: '0% 50%', transform: `translateY(${yPos * 0.52}px)` }}>
            <line x1="1" y1="50" x2="6" y2="45" stroke="#000" />
            <line x1="1" y1="50" x2="6" y2="55" stroke="#000" />
          </g>
          {connected && tgtY !== null && <text x={15} y={50} fill="#0c3" style={{ fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{tgtY.toFixed(2)}</text>}
          {connected && <text x={15} y={60} fill="#000" style={{ fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{yPos.toFixed(2)}</text>}
          {!connected && <text x={30} y={55} fill="#f33" style={{ width: 30, textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>NO CONN</text>}
          {connected && <rect x="0" y="0" width="60" height="100" fill="transparent" stroke="transparent" onClick={onRectClick} onMouseMove={onRectMove} />}
        </svg>
      </div>
    </div>
  );
};

ReactDOM.render(
  <App />,
  document.getElementById('root')
);