const { useState, useEffect } = React;

const host = window.location.hostname === 'localhost' ? 'robotarm.local' : window.location.host;

const ws = new WebSocket(`ws://${host}/ws`);

ws.onerror = () => {
  console.log('error');
}

const ACC_W = 'EE:01:91:49:AD:A3';
const ACC_Y = 'E2:84:F1:3D:EC:DD';
const ACC_R = 'F6:68:59:8D:FE:51';

// Vrpm = (speed × 30000)/(Mstep × 200)(RPM) 1.8°motor
const Mstep = 16;


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

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let locked = false;
const send = async (id, msg, returnLength = 1) => {
  while (locked) await delay(100);
  locked = true;

  if (msg instanceof Array)
    ws.send(new Uint8Array([0xe0 + id, ...msg]));
  else
    ws.send([0xe0 + id, ...msg]);
  const res = await read(id, returnLength);

  locked = false;
  return res;
}

const Placeholder = () => <div style={{ display: 'inline-block', width: 100 }} />;
const Btn = ({ children, ...rest }) => <button style={{ width: 100, height: 100 }} {...rest}>{children}</button>;

const accel = 3000;
const speed = 6000;

const GET_PULSES = 0x33;
const GET_SERIAL_ENABLED = 0xf3;
const ROTATE = 0xfd;
const STOP = 0xf7;

const msgQueue = [];

const checkUartEnabled = async (id) => {
  const [res] = await send(id, [GET_SERIAL_ENABLED, 0x01], 1);
  return res === 1;
}

const getPulses = async (id) => {
  const [a, b, c, d] = await send(id, [GET_PULSES], 4);
  return (a << 24) + (b << 16) + (c << 8) + d;
}

const stop = async (id) => {
  await send(id, [STOP], 1);
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

const PULSES_PER_ROTATION = 200 * 8 * 37;// 200 * 16 * 25;

// max speeed = 0x7f aka 127
const rotate = async (id, speed, position) => {
  let pos = Math.abs(Math.round(position * PULSES_PER_ROTATION / 360));
  let ok = 0;
  const signBit = (position > 0) ? 0b10000000 : 0;
  while (pos > 0) {
    const p = pos > 0xffff ? 0xffff : pos;
    pos -= p;
    console.log('rotate', pos, id, signBit, speed, p & 0xff, p >> 8);
    const [lastok] = await send(id, [
      ROTATE,
      signBit + speed,
      0xff && (p >> 8), p & 0xff
    ], 1);
    ok = lastok;
  }
  return ok === 1;
}

const getSpeed = (delta) => {
  const d = Math.abs(delta);
  if (d > 90) return 126;
  if (d > 60) return 121;
  if (d > 45) return 120;
  if (d > 30) return 115;
  if (d > 10) return 112;
  return 100;
}

let lastW = null;
let lastY = null;
let lastX = null;
let lastR = null;

const App = () => {
  const moveW = async (x) => {
    const axis = 1;
    if (lastW === null) lastW = (await getPulses(axis)) / PULSES_PER_ROTATION * 360;
    const delta = x - lastW + offW;
    const speed = getSpeed(delta);
    await rotate(axis, speed, delta);
    lastW = x + offW;
  }

  const moveY = async (y) => {
    const axis = 0;
    if (lastY === null) lastY = ((await getPulses(axis)) / PULSES_PER_ROTATION * 360);
    const delta = y - lastY + offY;
    const speed = getSpeed(delta);
    await rotate(axis, speed, delta);
    lastY = y + offY;
  }

  const moveX = async (x) => {
    const axis = 2;
    if (lastX === null) lastX = ((await getPulses(axis)) / PULSES_PER_ROTATION * 360);
    const delta = x - lastX + offX;
    const speed = getSpeed(delta);
    await rotate(axis, speed, delta);
    lastX = x + offX;
  }

  const moveR = async (r) => {
    const axis = 3;
    if (lastR === null) lastR = ((await getPulses(axis)) / PULSES_PER_ROTATION * 360);
    const delta = r - lastR + offR;
    const speed = getSpeed(delta);
    await rotate(axis, speed, delta);
    lastR = r + offR;
  }

  const [offX, setOffX] = useState(0);
  const [offR, setOffR] = useState(0);
  const [offY, setOffY] = useState(0);
  const [offW, setOffW] = useState(0);

  const [xPos, setXPos] = useState(0);
  const [yPos, setYPos] = useState(0);
  const [rPos, setRPos] = useState(0);
  const [wPos, setWPos] = useState(0);
  const [connected, setConnected] = useState(ws.readyState === 1);
  const [accY, setAccY] = useState(0);
  const [accW, setAccW] = useState(0);
  const [accR, setAccR] = useState(0);

  const Y = yPos - offY;
  const W = wPos - offW;
  const R = rPos - offR;

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

      if (await checkUartEnabled(2)) {
        monitorAxis(2, (angle) => {
          setXPos(angle);
        });
      }

      if (await checkUartEnabled(3)) {
        monitorAxis(3, (angle) => {
          setRPos(angle);
        });
      }

      // monitorServos((r, x) => {
      //   setXPos(x - offX);
      //   setRPos(r - offR);
      // });
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

  const stopClick = async () => {
    // fetch('http://servos.local/stop').catch(e => console.error(e));
    await stop(0);
    await stop(1);
    await stop(2);
    await stop(3);
    lastW = null;
    lastY = null;
  }

  const calibrateAcc = async () => {
    try {
      const aw = await acc(ACC_W);
      if (!aw) return;

      const ay = await acc(ACC_Y);
      if (!ay) return;

      const ar = await acc(ACC_R);
      if (!ar) return;

      const aW = yprl(aw).yaw + 90;
      setAccW(aW);

      const aY = yprl(ay).yaw + 90;
      setAccY(aY);

      const aR = yprl(ar).yaw + 90;
      setAccR(aR);

      setOffW(wPos - aW);
      setOffY(yPos - aY - aW);
      setOffR(rPos - aY - aW - aR);
    } catch (e) {
      console.log(e);
    }
  }

  const solve = ({ x, y }) => {
    if (!window.target) return [];
    if (!window.solver) return [];
    window.target.setX(x);
    window.target.setY(-y);
    window.solver.update();
    return window.solver.angleChains[0];
  }

  const setTarget = (x, y) => {
    target.setX(x);
    target.setY(y);

    const [, W, Y] = solve({ x, y });
    if (!W || !Y) return;
    setTgtW(-W);
    setTgtY(Y - W);

    return [-W, Y - W];
  }

  const homeClick = async () => {
    const [w, y] = setTarget(0, -120);
    console.log(w, y);

    moveW(w);
    moveY(y);
  };

  const renderClick = (e) => {
    if (e.buttons === 0) return;
    const bounding = e.target.getBoundingClientRect();

    const click = window.cast(e.clientX - bounding.left, e.clientY - bounding.top);
    if (!click) return;

    setTarget(click[0], click[1]);
  }

  const renderGo = (e) => {
    moveW(tgtW);
    moveY(tgtY);
  }

  useEffect(() => {
    if (window.W && window.Y && window.R) {
      window.W.rotation.z = -1 * (W) / 180 * Math.PI;
      window.Y.rotation.z = (Y) / 180 * Math.PI;
      window.R.rotation.z = (R) / 180 * Math.PI;
    }
  }, [W, Y, R]);

  useEffect(() => {
    if (window.TW && window.TY && window.TR) {
      window.TW.rotation.z = -1 * (tgtW) / 180 * Math.PI;
      window.TY.rotation.z = (tgtY) / 180 * Math.PI;
      window.TR.rotation.z = (tgtR) / 180 * Math.PI;
    }
  }, [tgtW, tgtY, tgtR]);

  return (
    <div>
      <div style={{ display: "flex" }}>
        <GaugeRound connected={connected} target={tgtX - offX} value={xPos - offX} onChange={pos => setTgtX(pos + offX)} onMove={pos => moveX(pos + offX)} />
        <GaugeRound inverse connected={connected} target={tgtW} value={W} onChange={pos => setTgtW(pos)} onMove={pos => moveW(pos)} />
        <GaugeRound connected={connected} target={tgtY} value={Y} onChange={pos => setTgtY(pos)} onMove={pos => moveY(pos)} />
        <GaugeRound connected={connected} target={tgtR} value={R} onChange={pos => setTgtR(pos)} onMove={pos => moveR(pos)} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {connected && <Button title="STOP" color="#f33" onClick={stopClick} />}
          {connected && <Button title="HOME" color="#ccc" onClick={homeClick} />}
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        <span id="render" onMouseMove={renderClick} onMouseDown={renderClick} onMouseUp={renderGo}></span>
      </div>
      <div>
        <GaugeRound connected target={null} value={accW} onChange={calibrateAcc} onMove={() => { }} />
        <GaugeRound connected target={null} value={accW + accY} onChange={calibrateAcc} onMove={() => { }} />
        <GaugeRound connected target={null} value={accW + accY + accR} onChange={calibrateAcc} onMove={() => { }} />
      </div>
    </div>
  );
};

ReactDOM.render(
  <App />,
  document.getElementById('root')
);