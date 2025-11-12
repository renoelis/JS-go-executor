// buf.writeFloatBE/LE() - 实际应用场景模拟测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 网络协议场景 - 模拟浮点数传输
test('模拟网络协议：写入多个浮点数据包', () => {
  const buf = Buffer.allocUnsafe(100);
  let offset = 0;

  // 模拟温度数据
  offset = buf.writeFloatBE(23.5, offset);
  offset = buf.writeFloatBE(24.1, offset);
  offset = buf.writeFloatBE(22.8, offset);

  // 模拟湿度数据
  offset = buf.writeFloatBE(65.3, offset);
  offset = buf.writeFloatBE(68.7, offset);

  return offset === 20 &&
         Math.abs(buf.readFloatBE(0) - 23.5) < 0.1 &&
         Math.abs(buf.readFloatBE(16) - 68.7) < 0.1;
});

test('模拟网络协议：小端序传感器数据', () => {
  const buf = Buffer.allocUnsafe(40);
  const sensors = [
    {id: 1, value: 12.34},
    {id: 2, value: 56.78},
    {id: 3, value: 90.12}
  ];

  let offset = 0;
  for (const sensor of sensors) {
    buf.writeUInt32LE(sensor.id, offset);
    offset += 4;
    buf.writeFloatLE(sensor.value, offset);
    offset += 4;
  }

  return buf.readUInt32LE(0) === 1 &&
         Math.abs(buf.readFloatLE(4) - 12.34) < 0.01 &&
         buf.readUInt32LE(8) === 2 &&
         Math.abs(buf.readFloatLE(12) - 56.78) < 0.01;
});

// 二进制文件格式场景
test('模拟二进制文件头：写入版本和浮点配置', () => {
  const buf = Buffer.allocUnsafe(16);

  // 魔数
  buf.writeUInt32BE(0x89504E47, 0);
  // 版本号
  buf.writeUInt16BE(1, 4);
  // 配置参数
  buf.writeFloatBE(1.5, 6);
  buf.writeFloatBE(2.0, 10);

  return buf.readUInt32BE(0) === 0x89504E47 &&
         buf.readFloatBE(6) === 1.5 &&
         buf.readFloatBE(10) === 2.0;
});

test('模拟音频数据：写入采样点', () => {
  const buf = Buffer.allocUnsafe(40);
  const samples = Array.from({length: 10}, (_, i) =>
    Math.sin(i * Math.PI / 5)
  );

  for (let i = 0; i < samples.length; i++) {
    buf.writeFloatLE(samples[i], i * 4);
  }

  return Math.abs(buf.readFloatLE(0) - samples[0]) < 0.001 &&
         Math.abs(buf.readFloatLE(36) - samples[9]) < 0.001;
});

// 科学计算场景
test('模拟矩阵存储：2x2 矩阵按行存储', () => {
  const buf = Buffer.allocUnsafe(16);
  const matrix = [
    [1.1, 2.2],
    [3.3, 4.4]
  ];

  let offset = 0;
  for (const row of matrix) {
    for (const val of row) {
      buf.writeFloatBE(val, offset);
      offset += 4;
    }
  }

  return Math.abs(buf.readFloatBE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatBE(4) - 2.2) < 0.01 &&
         Math.abs(buf.readFloatBE(8) - 3.3) < 0.01 &&
         Math.abs(buf.readFloatBE(12) - 4.4) < 0.01;
});

test('模拟向量运算：存储计算结果', () => {
  const buf = Buffer.allocUnsafe(12);
  const vec1 = [1.0, 2.0, 3.0];
  const vec2 = [4.0, 5.0, 6.0];

  // 向量点积结果
  const dotProduct = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);

  // 存储各分量乘积
  for (let i = 0; i < 3; i++) {
    buf.writeFloatLE(vec1[i] * vec2[i], i * 4);
  }

  const sum = buf.readFloatLE(0) + buf.readFloatLE(4) + buf.readFloatLE(8);
  return Math.abs(sum - dotProduct) < 0.1;
});

// 图形渲染场景
test('模拟顶点坐标：存储3D坐标', () => {
  const buf = Buffer.allocUnsafe(48);
  const vertices = [
    {x: 0.0, y: 0.0, z: 0.0},
    {x: 1.0, y: 0.0, z: 0.0},
    {x: 0.0, y: 1.0, z: 0.0},
    {x: 0.0, y: 0.0, z: 1.0}
  ];

  let offset = 0;
  for (const v of vertices) {
    buf.writeFloatLE(v.x, offset);
    buf.writeFloatLE(v.y, offset + 4);
    buf.writeFloatLE(v.z, offset + 8);
    offset += 12;
  }

  return buf.readFloatLE(0) === 0.0 &&
         buf.readFloatLE(12) === 1.0 &&
         buf.readFloatLE(28) === 1.0 &&
         buf.readFloatLE(44) === 1.0;
});

test('模拟颜色数据：RGBA 浮点格式', () => {
  const buf = Buffer.allocUnsafe(32);
  const colors = [
    {r: 1.0, g: 0.0, b: 0.0, a: 1.0},  // 红色
    {r: 0.0, g: 1.0, b: 0.0, a: 0.5}   // 半透明绿色
  ];

  let offset = 0;
  for (const c of colors) {
    buf.writeFloatBE(c.r, offset);
    buf.writeFloatBE(c.g, offset + 4);
    buf.writeFloatBE(c.b, offset + 8);
    buf.writeFloatBE(c.a, offset + 12);
    offset += 16;
  }

  return buf.readFloatBE(0) === 1.0 &&
         buf.readFloatBE(4) === 0.0 &&
         buf.readFloatBE(20) === 1.0 &&
         buf.readFloatBE(28) === 0.5;
});

// 游戏开发场景
test('模拟游戏状态：存储玩家位置和速度', () => {
  const buf = Buffer.allocUnsafe(24);

  const player = {
    position: {x: 100.5, y: 200.3, z: 50.7},
    velocity: {x: 1.2, y: -0.5, z: 0.0}
  };

  buf.writeFloatLE(player.position.x, 0);
  buf.writeFloatLE(player.position.y, 4);
  buf.writeFloatLE(player.position.z, 8);
  buf.writeFloatLE(player.velocity.x, 12);
  buf.writeFloatLE(player.velocity.y, 16);
  buf.writeFloatLE(player.velocity.z, 20);

  return Math.abs(buf.readFloatLE(0) - 100.5) < 0.1 &&
         Math.abs(buf.readFloatLE(4) - 200.3) < 0.1 &&
         Math.abs(buf.readFloatLE(16) - (-0.5)) < 0.1;
});

// 物联网场景
test('模拟 IoT 设备：批量传感器读数', () => {
  const buf = Buffer.allocUnsafe(80);
  const readings = Array.from({length: 20}, (_, i) => 20 + Math.random() * 10);

  for (let i = 0; i < readings.length; i++) {
    buf.writeFloatBE(readings[i], i * 4);
  }

  const firstReading = buf.readFloatBE(0);
  const lastReading = buf.readFloatBE(76);

  return firstReading >= 20 && firstReading <= 30 &&
         lastReading >= 20 && lastReading <= 30;
});

// 机器学习场景
test('模拟神经网络：存储权重矩阵', () => {
  const buf = Buffer.allocUnsafe(64);
  const weights = Array.from({length: 16}, () => Math.random() - 0.5);

  for (let i = 0; i < weights.length; i++) {
    buf.writeFloatLE(weights[i], i * 4);
  }

  let allValid = true;
  for (let i = 0; i < weights.length; i++) {
    const read = buf.readFloatLE(i * 4);
    if (Math.abs(read - weights[i]) >= 0.001) {
      allValid = false;
      break;
    }
  }

  return allValid;
});

// 金融场景
test('模拟金融数据：存储价格和涨跌幅', () => {
  const buf = Buffer.allocUnsafe(32);
  const stocks = [
    {price: 123.45, change: 2.34},
    {price: 678.90, change: -5.67},
    {price: 234.56, change: 0.12},
    {price: 890.12, change: 10.23}
  ];

  let offset = 0;
  for (const stock of stocks) {
    buf.writeFloatBE(stock.price, offset);
    buf.writeFloatBE(stock.change, offset + 4);
    offset += 8;
  }

  return Math.abs(buf.readFloatBE(0) - 123.45) < 0.01 &&
         Math.abs(buf.readFloatBE(12) - (-5.67)) < 0.01 &&
         Math.abs(buf.readFloatBE(28) - 10.23) < 0.01;
});

// 时间序列场景
test('模拟时间序列：存储每小时温度变化', () => {
  const buf = Buffer.allocUnsafe(96);
  const hourlyTemps = Array.from({length: 24}, (_, i) =>
    15 + 10 * Math.sin((i - 6) * Math.PI / 12)
  );

  for (let i = 0; i < hourlyTemps.length; i++) {
    buf.writeFloatLE(hourlyTemps[i], i * 4);
  }

  return buf.readFloatLE(0) > 0 && buf.readFloatLE(92) > 0;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
