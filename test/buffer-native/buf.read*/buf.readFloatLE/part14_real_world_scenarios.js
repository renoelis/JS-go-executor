// buf.readFloatLE() - 真实世界应用场景测试
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

// 二进制文件格式解析
test('解析二进制文件头（版本号浮点数）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(1.0, 0); // 版本 1.0
  buf.writeFloatLE(2.5, 4); // 数据版本 2.5
  
  return buf.readFloatLE(0) === 1.0 && buf.readFloatLE(4) === 2.5;
});

// 3D 模型顶点数据
test('读取 3D 模型顶点坐标 (x, y, z)', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatLE(1.5, 0);  // x
  buf.writeFloatLE(2.5, 4);  // y
  buf.writeFloatLE(3.5, 8);  // z
  
  return buf.readFloatLE(0) === 1.5 &&
         buf.readFloatLE(4) === 2.5 &&
         buf.readFloatLE(8) === 3.5;
});

// 音频采样数据
test('读取音频采样值（归一化 -1.0 到 1.0）', () => {
  const buf = Buffer.alloc(16);
  buf.writeFloatLE(0.0, 0);
  buf.writeFloatLE(0.5, 4);
  buf.writeFloatLE(-0.5, 8);
  buf.writeFloatLE(1.0, 12);
  
  return buf.readFloatLE(0) === 0.0 &&
         buf.readFloatLE(4) === 0.5 &&
         buf.readFloatLE(8) === -0.5 &&
         buf.readFloatLE(12) === 1.0;
});

// 游戏网络数据包
test('解析游戏玩家位置数据包', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatLE(100.5, 0);   // x 位置
  buf.writeFloatLE(200.75, 4);  // y 位置
  buf.writeFloatLE(50.25, 8);   // z 位置
  
  const x = buf.readFloatLE(0);
  const y = buf.readFloatLE(4);
  const z = buf.readFloatLE(8);
  
  return Math.abs(x - 100.5) < 0.01 &&
         Math.abs(y - 200.75) < 0.01 &&
         Math.abs(z - 50.25) < 0.01;
});

// 传感器数据流
test('读取温度传感器数据（摄氏度）', () => {
  const buf = Buffer.alloc(20);
  buf.writeFloatLE(23.5, 0);
  buf.writeFloatLE(24.2, 4);
  buf.writeFloatLE(23.8, 8);
  buf.writeFloatLE(25.1, 12);
  buf.writeFloatLE(24.7, 16);
  
  const temps = [0, 4, 8, 12, 16].map(offset => buf.readFloatLE(offset));
  const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
  
  return Math.abs(avg - 24.26) < 0.1;
});

// RGBA 颜色数据（归一化 0-1）
test('读取 RGBA 颜色值', () => {
  const buf = Buffer.alloc(16);
  buf.writeFloatLE(1.0, 0);   // R
  buf.writeFloatLE(0.5, 4);   // G
  buf.writeFloatLE(0.25, 8);  // B
  buf.writeFloatLE(1.0, 12);  // A
  
  return buf.readFloatLE(0) === 1.0 &&
         buf.readFloatLE(4) === 0.5 &&
         buf.readFloatLE(8) === 0.25 &&
         buf.readFloatLE(12) === 1.0;
});

// 矩阵变换数据（4x4 矩阵的部分元素）
test('读取变换矩阵元素', () => {
  const buf = Buffer.alloc(64); // 4x4 矩阵 = 16 floats
  buf.writeFloatLE(1.0, 0);  // m[0][0]
  buf.writeFloatLE(0.0, 4);  // m[0][1]
  buf.writeFloatLE(0.0, 8);  // m[0][2]
  buf.writeFloatLE(0.0, 12); // m[0][3]
  
  return buf.readFloatLE(0) === 1.0 &&
         buf.readFloatLE(4) === 0.0;
});

// 物理引擎状态数据
test('读取物体速度向量', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatLE(5.5, 0);   // vx
  buf.writeFloatLE(-3.2, 4);  // vy
  buf.writeFloatLE(0.0, 8);   // vz
  
  const vx = buf.readFloatLE(0);
  const vy = buf.readFloatLE(4);
  const vz = buf.readFloatLE(8);
  
  const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);
  
  return Math.abs(speed - 6.3717) < 0.01;
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
