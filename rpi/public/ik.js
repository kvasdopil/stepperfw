
const initIk = () => {
  const scene = new THREE.Scene();
  const solver = new FIK.Structure2D(scene, THREE);
  const target = new THREE.Vector3(0, 50, 0);
  var chain = new FIK.Chain2D();

  const baseLength = 30;
  var basebone = new FIK.Bone2D(new FIK.V2(0, 0), new FIK.V2(0, 20));
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
  solver.add(chain, target, true);

  solver.update();

  window.solver = solver;
  window.target = target;
}

setTimeout(() => {
  initIk();
}, 1000);

