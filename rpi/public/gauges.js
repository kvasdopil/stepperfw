
const GaugeRound = ({ connected, target, value, onChange, onMove, loading = false }) => {
  const click2degrees = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const dx = (e.clientX - left) / width - 0.5;
    const dy = (e.clientY - top) / height - 0.5;
    return 90 + Math.atan2(dy, dx) * 180 / Math.PI;
  }

  const onCircleClick = async (e) => {
    const a = click2degrees(e);
    onChange(a);
    onMove(a);
  }

  const onCircleMove = (e) => {
    if (e.buttons === 0) return;
    const a = click2degrees(e);
    onChange(a);
  }

  return <svg width="300" height="300" viewBox="0 0 100 100" >
    <circle cx="50" cy="50" r="49" fill="#333" stroke="#ccc" />
    {(value !== null && !loading) && <g style={{ transformOrigin: '50% 50%', transform: `rotate(${value}deg)` }}>
      <line x1="45" y1="10" x2="50" y2="1" stroke="#ccc" />
      <line x1="55" y1="10" x2="50" y2="1" stroke="#ccc" />
    </g>}
    {(target !== null && !loading) && <g style={{ transformOrigin: '50% 50%', transform: `rotate(${target}deg)` }}>
      <line x1="45" y1="15" x2="50" y2="6" stroke="#0c3" />
      <line x1="55" y1="15" x2="50" y2="6" stroke="#0c3" />
    </g>}
    {(connected && target !== null) && <text x={50} y={50} fill="#0c3" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{target.toFixed(2)}</text>}
    {(value !== null && !loading) && connected && <text x={50} y={60} fill="#ccc" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{value.toFixed(2)}</text>}
    {connected && <rect x="0" y="0" width="100" height="100" fill="transparent" stroke="transparent" onClick={onCircleClick} onMouseMove={onCircleMove} />}
    {!connected && <text x={50} y={55} fill="#f33" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>NO CONNECTION</text>}
    {(loading || value === null) && <text x={50} y={55} fill="#ccc" style={{ textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>NO DATA</text>}
  </svg>
}

const GaugeSquare = ({ connected, target, value, onChange, onMove }) => {
  const event2degrees = (e) => {
    const { top, height } = e.target.getBoundingClientRect();
    const dy = (e.clientY - top) / height - 0.5;
    return 190 * dy;
  }

  const onRectMove = (e) => {
    if (e.buttons === 0) return;
    const a = event2degrees(e);
    onChange(a);
  }

  const onRectClick = async (e) => {
    const a = event2degrees(e);
    onChange(a);
    onMove(a);
  }

  return <svg width="200" height="300" viewBox="0 0 60 100" >
    <rect x="0" y="0" width="59" height="99" fill="#333" stroke="#ccc" />
    {target !== null && <g style={{ transformOrigin: '0% 50%', transform: `translateY(${target * 0.52}px)` }}>
      <line x1="4" y1="50" x2="9" y2="45" stroke="#0c3" />
      <line x1="4" y1="50" x2="9" y2="55" stroke="#0c3" />
    </g>}
    <g style={{ transformOrigin: '0% 50%', transform: `translateY(${value * 0.52}px)` }}>
      <line x1="1" y1="50" x2="6" y2="45" stroke="#ccc" />
      <line x1="1" y1="50" x2="6" y2="55" stroke="#ccc" />
    </g>
    {connected && target !== null && <text x={15} y={50} fill="#0c3" style={{ fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{target.toFixed(2)}</text>}
    {connected && <text x={15} y={60} fill="#ccc" style={{ fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>{value.toFixed(2)}</text>}
    {!connected && <text x={30} y={55} fill="#f33" style={{ width: 30, textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 10, userSelect: 'none' }}>NO CONN</text>}
    {connected && <rect x="0" y="0" width="60" height="100" fill="transparent" stroke="transparent" onClick={onRectClick} onMouseMove={onRectMove} />}
  </svg>
};

const Button = ({ title, color, onClick }) => {
  return <svg width="150" height="150" viewBox="0 0 100 100" style={{ paddingLeft: 8, cursor: 'pointer' }} onClick={onClick}>
    <circle cx="50" cy="50" r="40" stroke={color} fill="#333" strokeWidth={5} />
    <text x={50} y={58} fill={color} style={{ fontFamily: 'sans-serif', textAnchor: 'middle', fontSize: 20, userSelect: 'none' }}>{title}</text>
  </svg>
}

window.GaugeRound = GaugeRound;
window.GaugeSquare = GaugeSquare;
window.Button = Button;