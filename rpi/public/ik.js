
const initIk = () => {
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  const w = 500;
  const h = 500;
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x222322, 1);
  document.querySelector('#render').appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);

  const l = new THREE.DirectionalLight(0xFFFFFF, 1)//new THREE.SpotLight( 0xffffff, 1, 0, Math.PI / 2 );
  l.position.set(0, 200, 0);
  scene.add(l);

  l.castShadow = true;
  const s = l.shadow
  s.mapSize.setScalar(2048);
  s.camera.top = s.camera.right = 200
  s.camera.bottom = s.camera.left = -200
  s.camera.near = 100
  s.camera.far = 400
  s.bias = -0.0001

  const cameraOff = 70;
  camera.position.set(0, cameraOff, 250);
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
  grid.position.y = cameraOff;
  grid.rotation.x = -Math.PI * 0.5;
  scene.add(grid);

  const solver = new FIK.Structure2D(scene, THREE);
  const target = new THREE.Vector3(0, 50, 0);

  const tgt = new THREE.Mesh(new THREE.SphereBufferGeometry(4, 8, 8), new THREE.MeshStandardMaterial({ color: 'red' }));
  tgt.castShadow = true;
  scene.add(tgt);
  tgt.position.copy(target);


  const base = new THREE.Mesh(new THREE.CylinderBufferGeometry(20, 20, 10, 32), new THREE.MeshStandardMaterial({ color: 'white' }));
  scene.add(base);
  base.position.y = -5;

  const TW = new THREE.Group();
  TW.position.y = 10;

  const W = new THREE.Group();
  W.position.y = 10;

  const green = new THREE.MeshStandardMaterial({ color: 'green' });
  const white = new THREE.MeshStandardMaterial({ color: 'white', opacity: 0.5, transparent: true });

  const TjointW = new THREE.Mesh(new THREE.CylinderBufferGeometry(8, 8, 30, 32), green);
  TjointW.rotation.x = Math.PI * 0.5;
  TW.add(TjointW);

  const jointW = new THREE.Mesh(new THREE.CylinderBufferGeometry(10, 10, 30, 32), white);
  jointW.rotation.x = Math.PI * 0.5;
  W.add(jointW);

  const TlegW = new THREE.Mesh(new THREE.CylinderBufferGeometry(8, 8, 50, 32), green);
  TlegW.position.y = 20;
  TW.add(TlegW);

  const legW = new THREE.Mesh(new THREE.CylinderBufferGeometry(10, 10, 50, 32), white);
  legW.position.y = 20;
  W.add(legW);

  window.TW = TW;
  window.W = W;

  const TY = new THREE.Group();
  TY.position.y = 50;
  TW.add(TY);

  const Y = new THREE.Group();
  Y.position.y = 50;
  W.add(Y);

  const TjointY = new THREE.Mesh(new THREE.CylinderBufferGeometry(8, 8, 30, 32), green);
  TjointY.rotation.x = Math.PI * 0.5;
  TY.add(TjointY);

  const jointY = new THREE.Mesh(new THREE.CylinderBufferGeometry(10, 10, 30, 32), white);
  jointY.rotation.x = Math.PI * 0.5;
  Y.add(jointY);

  const TlegY = new THREE.Mesh(new THREE.CylinderBufferGeometry(8, 8, 50, 32), green);
  TlegY.position.y = 20;
  TY.add(TlegY);

  const legY = new THREE.Mesh(new THREE.CylinderBufferGeometry(10, 10, 50, 32), white);
  legY.position.y = 20;
  Y.add(legY);

  window.TY = TY;
  window.Y = Y;

  const TR = new THREE.Group();
  TR.position.y = 50;
  TY.add(TR);

  const R = new THREE.Group();
  R.position.y = 50;
  Y.add(R);

  const TjointR = new THREE.Mesh(new THREE.CylinderBufferGeometry(8, 8, 30, 32), green);
  TjointR.rotation.x = Math.PI * 0.5;
  TR.add(TjointR);

  const jointR = new THREE.Mesh(new THREE.CylinderBufferGeometry(10, 10, 30, 32), white);
  jointR.rotation.x = Math.PI * 0.5;
  R.add(jointR);

  const TlegR = new THREE.Mesh(new THREE.CylinderBufferGeometry(8, 8, 10, 32), green);
  TlegR.position.y = 10;
  TR.add(TlegR);

  const legR = new THREE.Mesh(new THREE.CylinderBufferGeometry(10, 10, 10, 32), white);
  legR.position.y = 10;
  R.add(legR);

  window.R = R;
  window.TR = TR;

  scene.add(W);
  scene.add(TW);

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

  const thirdLength = 20;
  chain.addConsecutiveBone(new FIK.V2(0, 1), thirdLength, 90, 90);

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
    return [pt.point.x, pt.point.y - (50 + cameraOff)]
  }

  const allPoints = [];
  const pointsMaterial = new THREE.MeshStandardMaterial({ color: 'white' });
  window.updatePoints = (points) => {
    console.log('updatePoints', points);
    for (const p of allPoints) {
      scene.remove(p);
    }
    for (const p of points) {
      const pp = new THREE.Mesh(new THREE.SphereBufferGeometry(3, 8, 8), pointsMaterial);
      pp.castShadow = true;
      pp.position.x = p.x;
      pp.position.y = -p.y;
      scene.add(pp);
      allPoints.push(pp);
      console.log('updatePoints', points);
      window.lastPt = pp;
      window.scene = scene;

      // const txt = new THREE.TextGeometry({
      //   text: 'Hello world', 
      //   font: 
      //   size: 80,
      //   height: 5,
      //   curveSegments: 12,
      //   bevelEnabled: true,
      //   bevelThickness: 10,
      //   bevelSize: 8,
      //   bevelOffset: 0,
      //   bevelSegments: 5
      // });
      // scene.add(txt);
      // allPoints.push(txt);
    }
  }
}

setTimeout(() => {
  initIk();
}, 1000);

