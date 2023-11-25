I2C1.setup({ sda: D12, scl: D11 });
r = () => {
  acc = require("LIS3DH").connectI2C(I2C1);
  d = acc.read();
  acc.off();
  return [d.x * 16384, d.y * 16384, d.z * 16384];
}
