
const initIk = () => {
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(500, 500);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x222322, 1);
  document.querySelector('#render').appendChild(renderer.domElement);

  const w = 500;
  const h = 500;
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);

  const l = new THREE.DirectionalLight(0xFFFFFF, 1)//new THREE.SpotLight( 0xffffff, 1, 0, Math.PI / 2 );
  l.position.set(0, 200, 0);
  scene.add(l);

  l.castShadow = true;
  const s = l.shadow
  s.mapSize.setScalar(2048);
  s.camera.top = s.camera.right = 150
  s.camera.bottom = s.camera.left = -150
  s.camera.near = 100
  s.camera.far = 400
  s.bias = -0.0001

  camera.position.set(0, 30, 210);
  l.position.set(40, 100, 200);
  // controler.update();

  const ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(300, 300, 1, 1), new THREE.ShadowMaterial({ opacity: 0.5 }));
  //ground.geometry.applyMatrix( new THREE.Matrix4().makeRotationX(-Math.PI*0.5) );
  ground.castShadow = false;
  ground.receiveShadow = true;
  ground.position.z = -5.01;
  scene.add(ground);

  const grid = new THREE.GridHelper(300, 16, 0x0A0B0A, 0x070807);
  grid.position.z = -5;
  grid.rotation.x = -Math.PI * 0.5;
  scene.add(grid);

  const solver = new FIK.Structure2D(scene, THREE);
  const target = new THREE.Vector3(0, 50, 0);

  const tgt = new THREE.Mesh(new THREE.SphereBufferGeometry(3, 8, 8), new THREE.MeshStandardMaterial({ color: 'red' }));
  tgt.castShadow = true;
  scene.add(tgt);
  tgt.position.copy(target);

  const G1 = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderBufferGeometry(20, 20, 10, 32), new THREE.MeshStandardMaterial({ color: 'white' }));
  G1.add(base);

  const joint1 = new THREE.Mesh(new THREE.CylinderBufferGeometry(10, 10, 10, 32), new THREE.MeshStandardMaterial({ color: 'blue' }));
  joint1.position.y = 10;
  joint1.rotation.x = Math.PI * 0.5;
  G1.add(joint1);

  scene.add(G1);

  var chain = new FIK.Chain2D();

  const baseLength = 10;
  var basebone = new FIK.Bone2D(new FIK.V2(0, 0), new FIK.V2(0, baseLength));
  basebone.setClockwiseConstraintDegs(0);
  basebone.setAnticlockwiseConstraintDegs(0);
  chain.addBone(basebone);

  // Fix the base bone to its current location, and constrain it to the positive Y-axis
  chain.setFixedBaseMode(true);
  chain.setBaseboneConstraintType(FIK.GLOBAL_ABSOLUTE);
  chain.setBaseboneConstraintUV(new FIK.V2(0, 1));

  // Create and add the second bone
  const firstLength = 50;
  chain.addConsecutiveBone(new FIK.V2(0, 1), firstLength, 90, 90);

  // Create and add the third bone
  const secondLength = 50;
  chain.addConsecutiveBone(new FIK.V2(0, 1), secondLength, 145, 0);

  // Finally, add the chain to the structure
  solver.add(chain, tgt.position, true);

  solver.update();

  window.solver = solver;
  window.target = tgt.position;

  function render() {
    requestAnimationFrame(render);
    // TWEEN.update();
    renderer.render(scene, camera);
  }

  render();

  window.cast = (x, y) => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (x / w) * 2 - 1;
    mouse.y = (y / h) * 2 - 1;
    raycaster.setFromCamera(mouse, camera);
    const pt = raycaster.intersectObjects([ground]).pop();
    if (!pt) return null;
    return [pt.point.x, pt.point.y - 50]
  }
}

setTimeout(() => {
  initIk();
}, 1000);

