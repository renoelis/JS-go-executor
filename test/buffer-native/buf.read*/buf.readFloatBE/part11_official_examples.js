// buf.readFloatBE() - 官方示例和实际应用测试
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

// Node.js 官方文档示例
test('官方示例：Buffer.from([1,2,3,4])', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const result = buf.readFloatBE(0);
  return result === 2.387939260590663e-38;
});

test('官方示例验证精确值', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const expected = 2.387939260590663e-38;
  return buf.readFloatBE(0) === expected;
});

// 实际应用场景
test('温度数据序列化', () => {
  const buf = Buffer.alloc(4);
  const temperature = 36.5;
  buf.writeFloatBE(temperature, 0);
  return Math.abs(buf.readFloatBE(0) - temperature) < 0.01;
});

test('传感器读数', () => {
  const buf = Buffer.alloc(16);
  const readings = [25.3, 26.1, 25.8, 26.4];
  
  readings.forEach((val, i) => {
    buf.writeFloatBE(val, i * 4);
  });
  
  return readings.every((val, i) => 
    Math.abs(buf.readFloatBE(i * 4) - val) < 0.1
  );
});

test('音频采样值', () => {
  const buf = Buffer.alloc(4);
  const sample = -0.5; // -1 到 1
  buf.writeFloatBE(sample, 0);
  return buf.readFloatBE(0) === sample;
});

test('归一化像素值', () => {
  const buf = Buffer.alloc(4);
  const normalized = 0.75; // 0-1 范围
  buf.writeFloatBE(normalized, 0);
  return buf.readFloatBE(0) === normalized;
});

// 网络协议模拟
test('二进制协议头解析', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatBE(1.0, 0);      // version
  buf.writeFloatBE(1234.5, 4);   // payload size
  buf.writeFloatBE(9876.5, 8);   // timestamp
  
  return buf.readFloatBE(0) === 1.0 &&
         Math.abs(buf.readFloatBE(4) - 1234.5) < 0.1 &&
         Math.abs(buf.readFloatBE(8) - 9876.5) < 0.1;
});

// 数组序列化
test('浮点数组序列化', () => {
  const values = [1.1, 2.2, 3.3, 4.4, 5.5];
  const buf = Buffer.alloc(values.length * 4);
  
  values.forEach((val, i) => {
    buf.writeFloatBE(val, i * 4);
  });
  
  let success = true;
  values.forEach((val, i) => {
    const read = buf.readFloatBE(i * 4);
    if (Math.abs(read - val) >= 0.01) {
      success = false;
    }
  });
  
  return success;
});

// 统计数据
test('平均值计算', () => {
  const values = [10.5, 20.3, 30.7, 40.2];
  const avg = values.reduce((a, b) => a + b) / values.length;
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(avg, 0);
  return Math.abs(buf.readFloatBE(0) - avg) < 0.01;
});

// 多值混合读取
test('混合数据类型读取', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatBE(3.14, 0);
  buf.writeFloatBE(2.718, 4);
  buf.writeFloatBE(1.414, 8);
  
  return Math.abs(buf.readFloatBE(0) - 3.14) < 0.01 &&
         Math.abs(buf.readFloatBE(4) - 2.718) < 0.001 &&
         Math.abs(buf.readFloatBE(8) - 1.414) < 0.001;
});

// 游戏坐标
test('游戏角色坐标', () => {
  const buf = Buffer.alloc(12);
  const x = 100.5, y = 200.3, z = 50.7;
  buf.writeFloatBE(x, 0);
  buf.writeFloatBE(y, 4);
  buf.writeFloatBE(z, 8);
  
  return Math.abs(buf.readFloatBE(0) - x) < 0.1 &&
         Math.abs(buf.readFloatBE(4) - y) < 0.1 &&
         Math.abs(buf.readFloatBE(8) - z) < 0.1;
});

// 颜色值（归一化）
test('RGB 颜色归一化值', () => {
  const buf = Buffer.alloc(12);
  const r = 0.8, g = 0.6, b = 0.4;
  buf.writeFloatBE(r, 0);
  buf.writeFloatBE(g, 4);
  buf.writeFloatBE(b, 8);
  
  return Math.abs(buf.readFloatBE(0) - r) < 0.00001 &&
         Math.abs(buf.readFloatBE(4) - g) < 0.00001 &&
         Math.abs(buf.readFloatBE(8) - b) < 0.00001;
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
