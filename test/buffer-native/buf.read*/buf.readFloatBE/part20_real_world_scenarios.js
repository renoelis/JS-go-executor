// buf.readFloatBE() - 真实世界应用场景测试
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

// ============ 二进制文件格式解析 ============

test('解析二进制浮点数数组（大端序）', () => {
  // 模拟从文件读取的二进制数据
  const values = [1.1, 2.2, 3.3, 4.4, 5.5];
  const buf = Buffer.alloc(values.length * 4);
  values.forEach((v, i) => buf.writeFloatBE(v, i * 4));
  
  // 解析
  const parsed = [];
  for (let i = 0; i < values.length; i++) {
    parsed.push(buf.readFloatBE(i * 4));
  }
  
  return parsed.every((v, i) => Math.abs(v - values[i]) < 0.01);
});

test('解析 3D 模型顶点数据', () => {
  // 3D 顶点 (x, y, z)
  const vertices = [
    { x: 1.5, y: 2.3, z: -0.5 },
    { x: -2.1, y: 0.0, z: 3.7 }
  ];
  
  const buf = Buffer.alloc(vertices.length * 12);
  vertices.forEach((v, i) => {
    const offset = i * 12;
    buf.writeFloatBE(v.x, offset);
    buf.writeFloatBE(v.y, offset + 4);
    buf.writeFloatBE(v.z, offset + 8);
  });
  
  const parsed = [];
  for (let i = 0; i < vertices.length; i++) {
    const offset = i * 12;
    parsed.push({
      x: buf.readFloatBE(offset),
      y: buf.readFloatBE(offset + 4),
      z: buf.readFloatBE(offset + 8)
    });
  }
  
  return parsed.every((p, i) => 
    Math.abs(p.x - vertices[i].x) < 0.01 &&
    Math.abs(p.y - vertices[i].y) < 0.01 &&
    Math.abs(p.z - vertices[i].z) < 0.01
  );
});

test('解析音频采样数据', () => {
  const samples = [-0.8, -0.4, 0.0, 0.4, 0.8];
  const buf = Buffer.alloc(samples.length * 4);
  samples.forEach((s, i) => buf.writeFloatBE(s, i * 4));
  
  const decoded = samples.map((_, i) => buf.readFloatBE(i * 4));
  return decoded.every((v, i) => Math.abs(v - samples[i]) < 0.001);
});

// ============ 网络协议数据包 ============

test('解析游戏网络数据包', () => {
  const packet = Buffer.alloc(16);
  // 玩家位置和状态
  packet.writeFloatBE(100.5, 0);   // x 坐标
  packet.writeFloatBE(200.3, 4);   // y 坐标
  packet.writeFloatBE(50.7, 8);    // z 坐标
  packet.writeFloatBE(0.95, 12);   // 生命值比例
  
  const x = packet.readFloatBE(0);
  const y = packet.readFloatBE(4);
  const z = packet.readFloatBE(8);
  const health = packet.readFloatBE(12);
  
  return Math.abs(x - 100.5) < 0.1 &&
         Math.abs(y - 200.3) < 0.1 &&
         Math.abs(z - 50.7) < 0.1 &&
         Math.abs(health - 0.95) < 0.01;
});

test('解析传感器数据流', () => {
  const sensorData = [
    { temp: 25.3, humidity: 60.5 },
    { temp: 26.1, humidity: 58.2 },
    { temp: 25.8, humidity: 59.0 }
  ];
  
  const buf = Buffer.alloc(sensorData.length * 8);
  sensorData.forEach((data, i) => {
    const offset = i * 8;
    buf.writeFloatBE(data.temp, offset);
    buf.writeFloatBE(data.humidity, offset + 4);
  });
  
  const parsed = [];
  for (let i = 0; i < sensorData.length; i++) {
    const offset = i * 8;
    parsed.push({
      temp: buf.readFloatBE(offset),
      humidity: buf.readFloatBE(offset + 4)
    });
  }
  
  return parsed.every((p, i) =>
    Math.abs(p.temp - sensorData[i].temp) < 0.1 &&
    Math.abs(p.humidity - sensorData[i].humidity) < 0.1
  );
});

// ============ 图形处理 ============

test('解析 RGBA 颜色数据（归一化）', () => {
  const colors = [
    { r: 1.0, g: 0.5, b: 0.0, a: 1.0 },
    { r: 0.0, g: 0.8, b: 1.0, a: 0.5 }
  ];
  
  const buf = Buffer.alloc(colors.length * 16);
  colors.forEach((c, i) => {
    const offset = i * 16;
    buf.writeFloatBE(c.r, offset);
    buf.writeFloatBE(c.g, offset + 4);
    buf.writeFloatBE(c.b, offset + 8);
    buf.writeFloatBE(c.a, offset + 12);
  });
  
  const parsed = [];
  for (let i = 0; i < colors.length; i++) {
    const offset = i * 16;
    parsed.push({
      r: buf.readFloatBE(offset),
      g: buf.readFloatBE(offset + 4),
      b: buf.readFloatBE(offset + 8),
      a: buf.readFloatBE(offset + 12)
    });
  }
  
  return parsed.every((p, i) =>
    Math.abs(p.r - colors[i].r) < 0.001 &&
    Math.abs(p.g - colors[i].g) < 0.001 &&
    Math.abs(p.b - colors[i].b) < 0.001 &&
    Math.abs(p.a - colors[i].a) < 0.001
  );
});

test('解析矩阵变换数据', () => {
  // 2x2 矩阵
  const matrix = [
    [1.0, 0.5],
    [0.5, 1.0]
  ];
  
  const buf = Buffer.alloc(16);
  let offset = 0;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      buf.writeFloatBE(matrix[i][j], offset);
      offset += 4;
    }
  }
  
  const parsed = [];
  offset = 0;
  for (let i = 0; i < 2; i++) {
    parsed[i] = [];
    for (let j = 0; j < 2; j++) {
      parsed[i][j] = buf.readFloatBE(offset);
      offset += 4;
    }
  }
  
  return parsed.every((row, i) =>
    row.every((val, j) => Math.abs(val - matrix[i][j]) < 0.001)
  );
});

// ============ 物理模拟 ============

test('解析物理引擎状态数据', () => {
  const buf = Buffer.alloc(24);
  const velocity = { x: 10.5, y: -5.3, z: 0.0 };
  const acceleration = { x: 0.0, y: -9.8, z: 0.0 };
  
  buf.writeFloatBE(velocity.x, 0);
  buf.writeFloatBE(velocity.y, 4);
  buf.writeFloatBE(velocity.z, 8);
  buf.writeFloatBE(acceleration.x, 12);
  buf.writeFloatBE(acceleration.y, 16);
  buf.writeFloatBE(acceleration.z, 20);
  
  const v = {
    x: buf.readFloatBE(0),
    y: buf.readFloatBE(4),
    z: buf.readFloatBE(8)
  };
  const a = {
    x: buf.readFloatBE(12),
    y: buf.readFloatBE(16),
    z: buf.readFloatBE(20)
  };
  
  return Math.abs(v.x - velocity.x) < 0.1 &&
         Math.abs(v.y - velocity.y) < 0.1 &&
         Math.abs(v.z - velocity.z) < 0.001 &&
         Math.abs(a.x - acceleration.x) < 0.001 &&
         Math.abs(a.y - acceleration.y) < 0.1 &&
         Math.abs(a.z - acceleration.z) < 0.001;
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
