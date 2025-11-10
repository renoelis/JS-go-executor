// buf.readDoubleBE() - 官方示例和实际应用测试
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
test('官方示例：Buffer.from([1,2,3,4,5,6,7,8])', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const result = buf.readDoubleBE(0);
  return result === 8.20788039913184e-304;
});

test('官方示例验证精确值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const expected = 8.20788039913184e-304;
  return buf.readDoubleBE(0) === expected;
});

// 实际应用场景
test('温度数据序列化', () => {
  const buf = Buffer.alloc(8);
  const temperature = 36.5;
  buf.writeDoubleBE(temperature, 0);
  return buf.readDoubleBE(0) === temperature;
});

test('经纬度坐标', () => {
  const buf = Buffer.alloc(16);
  const lat = 39.9042;
  const lng = 116.4074;
  buf.writeDoubleBE(lat, 0);
  buf.writeDoubleBE(lng, 8);
  return Math.abs(buf.readDoubleBE(0) - lat) < 1e-10 &&
         Math.abs(buf.readDoubleBE(8) - lng) < 1e-10;
});

test('科学计算数据', () => {
  const buf = Buffer.alloc(8);
  const avogadro = 6.02214076e23;
  buf.writeDoubleBE(avogadro, 0);
  return buf.readDoubleBE(0) === avogadro;
});

test('财务金额（双精度）', () => {
  const buf = Buffer.alloc(8);
  const amount = 12345678.90;
  buf.writeDoubleBE(amount, 0);
  return buf.readDoubleBE(0) === amount;
});

// 网络协议模拟
test('二进制协议头解析', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleBE(1.0, 0);      // version
  buf.writeDoubleBE(1234.56, 8);  // payload size
  buf.writeDoubleBE(9876.54, 16); // timestamp
  
  return buf.readDoubleBE(0) === 1.0 &&
         Math.abs(buf.readDoubleBE(8) - 1234.56) < 0.01 &&
         Math.abs(buf.readDoubleBE(16) - 9876.54) < 0.01;
});

// 数组序列化
test('浮点数组序列化', () => {
  const values = [1.1, 2.2, 3.3, 4.4, 5.5];
  const buf = Buffer.alloc(values.length * 8);
  
  values.forEach((val, i) => {
    buf.writeDoubleBE(val, i * 8);
  });
  
  let success = true;
  values.forEach((val, i) => {
    const read = buf.readDoubleBE(i * 8);
    if (Math.abs(read - val) >= 0.01) {
      success = false;
    }
  });
  
  return success;
});

// 时间戳（高精度）
test('高精度时间戳', () => {
  const buf = Buffer.alloc(8);
  const timestamp = Date.now() + Math.random();
  buf.writeDoubleBE(timestamp, 0);
  return Math.abs(buf.readDoubleBE(0) - timestamp) < 1e-10;
});

// 传感器数据
test('传感器读数', () => {
  const buf = Buffer.alloc(32);
  const readings = [25.3, 26.1, 25.8, 26.4]; // 4 个传感器
  
  readings.forEach((val, i) => {
    buf.writeDoubleBE(val, i * 8);
  });
  
  return readings.every((val, i) => 
    Math.abs(buf.readDoubleBE(i * 8) - val) < 0.01
  );
});

// 图像处理（像素值归一化）
test('归一化像素值', () => {
  const buf = Buffer.alloc(8);
  const normalized = 0.75; // 0-1 范围
  buf.writeDoubleBE(normalized, 0);
  return buf.readDoubleBE(0) === normalized;
});

// 音频采样
test('音频采样值', () => {
  const buf = Buffer.alloc(8);
  const sample = -0.5; // -1 到 1
  buf.writeDoubleBE(sample, 0);
  return buf.readDoubleBE(0) === sample;
});

// 统计数据
test('平均值计算', () => {
  const values = [10.5, 20.3, 30.7, 40.2];
  const avg = values.reduce((a, b) => a + b) / values.length;
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(avg, 0);
  return Math.abs(buf.readDoubleBE(0) - avg) < 1e-10;
});

// 物理常数
test('光速常数', () => {
  const buf = Buffer.alloc(8);
  const c = 299792458.0; // 米/秒
  buf.writeDoubleBE(c, 0);
  return buf.readDoubleBE(0) === c;
});

test('普朗克常数', () => {
  const buf = Buffer.alloc(8);
  const h = 6.62607015e-34;
  buf.writeDoubleBE(h, 0);
  return buf.readDoubleBE(0) === h;
});

// 多值混合读取
test('混合数据类型读取', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleBE(Math.PI, 0);
  buf.writeDoubleBE(Math.E, 8);
  buf.writeDoubleBE(Math.SQRT2, 16);
  
  return Math.abs(buf.readDoubleBE(0) - Math.PI) < 1e-15 &&
         Math.abs(buf.readDoubleBE(8) - Math.E) < 1e-15 &&
         Math.abs(buf.readDoubleBE(16) - Math.SQRT2) < 1e-15;
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
