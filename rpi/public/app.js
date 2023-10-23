const { useState, useEffect } = React;

const host = window.location.hostname === 'localhost' ? 'robotarm.local' : window.location.host;

const ws = new WebSocket(`ws://${host}/ws`);

ws.onerror = () => {
  console.log('error');
}

const send = (msg) => {
  console.log('>', msg);
  ws.send(msg);
}

const Placeholder = () => <div style={{ display: 'inline-block', width: 100 }} />;
const Btn = ({ children, ...rest }) => <button style={{ width: 100, height: 100 }} {...rest}>{children}</button>;

const accel = 3000;
const speed = 6000;

const moveX = (x) => {
  send("XP40000");
  send("YP40000");
  send(`XS${speed}`);
  send(`XA${accel}`);
  send(`YS${speed}`);
  send(`YA${accel}`);
  send(`X=${x}`);
}
const moveY = (y) => {
  send("XP40000");
  send("YP40000");
  send(`XS${speed}`);
  send(`XA${accel}`);
  send(`YS${speed}`);
  send(`YA${accel}`);
  send(`Y=${y}`);
}
const moveXY = (x, y) => {
  send("XP40000");
  send("YP40000");
  send(`XS${speed}`);
  send(`XA${accel}`);
  send(`YS${speed}`);
  send(`YA${accel}`);
  send(`Y=${y}`);
  send(`X=${x}`);
}

const App = () => {
  const [xPos, setXPos] = useState(0);
  const [yPos, setYPos] = useState(0);
  const [connected, setConnected] = useState(ws.readyState === 1);

  useEffect(() => {
    const onClose = () => {
      setConnected(false);
    }
    const onOpen = () => {
      setConnected(true);

      send("X?");
      send("Y?");
    }
    const onMessage = (msg) => {
      for (const chunk of msg.data.split(" ")) {
        const ch = chunk.trim();
        if (ch.startsWith('X=')) setXPos(+ch.substr(2));
        if (ch.startsWith('Y=')) setYPos(+ch.substr(2));
        console.log(chunk);
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

  const [tgtRot, setTgtRot] = useState(null);
  const [tgtElev, setTgtElev] = useState(null);

  const setRot = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const dx = (e.clientX - left) / width - 0.5;
    const dy = (e.clientY - top) / height - 0.5;
    const angle = 90 + Math.atan2(dy, dx) * 180 / Math.PI;
    setTgtRot(angle);
    return angle;
  }

  const setElev = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const dy = (e.clientY - top) / height - 0.5;
    setTgtElev(190 * dy);
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
          {tgtRot !== null && <g style={{ transformOrigin: '50% 50%', transform: `rotate(${tgtRot}deg)` }}>
            <line x1="45" y1="15" x2="50" y2="6" stroke="#0c3" />
            <line x1="55" y1="15" x2="50" y2="6" stroke="#0c3" />
          </g>}
          {connected && tgtRot !== null && <text x={50} y={50} fill="#0c3" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{tgtRot.toFixed(2)}</text>}
          {connected && <text x={50} y={60} fill="#000" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{xPos.toFixed(2)}</text>}
          {connected && <rect x="0" y="0" width="100" height="100" fill="transparent" stroke="transparent" onClick={onCircleClick} onMouseMove={onCircleMove} />}
          {!connected && <text x={50} y={55} fill="#f33" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>NO CONNECTION</text>}
        </svg>
        <svg width="200" height="300" viewBox="0 0 60 100" >
          <rect x="0" y="0" width="200" height="300" fill="#ccc" />
          {tgtElev !== null && <g style={{ transformOrigin: '0% 50%', transform: `translateY(${tgtElev * 0.52}px)` }}>
            <line x1="4" y1="50" x2="9" y2="45" stroke="#0c3" />
            <line x1="4" y1="50" x2="9" y2="55" stroke="#0c3" />
          </g>}
          <g style={{ transformOrigin: '0% 50%', transform: `translateY(${yPos * 0.52}px)` }}>
            <line x1="1" y1="50" x2="6" y2="45" stroke="#000" />
            <line x1="1" y1="50" x2="6" y2="55" stroke="#000" />
          </g>
          {connected && tgtElev !== null && <text x={15} y={50} fill="#0c3" style={{ fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{tgtElev.toFixed(2)}</text>}
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