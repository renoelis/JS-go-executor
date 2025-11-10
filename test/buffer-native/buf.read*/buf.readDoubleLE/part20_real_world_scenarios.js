// buf.readDoubleLE() - 真实世界应用场景测试
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

test('解析二进制浮点数数组（小端序）', () => {
  // 模拟从文件读取的二进制数据
  const values = [1.1, 2.2, 3.3, 4.4, 5.5];
  const buf = Buffer.alloc(values.length * 8);
  values.forEach((v, i) => buf.writeDoubleLE(v, i * 8));
  
  // 解析
  const parsed = [];
  for (let i = 0; i < values.length; i++) {
    parsed.push(buf.readDoubleLE(i * 8));
  }
  
  return parsed.every((v, i) => Math.abs(v - values[i]) < 0.01);
});

test('解析图像元数据（EXIF GPS 坐标）', () => {
  const buf = Buffer.alloc(16);
  const latitude = 39.9042;  // 北纬
  const longitude = 116.4074; // 东经
  buf.writeDoubleLE(latitude, 0);
  buf.writeDoubleLE(longitude, 8);
  
  const lat = buf.readDoubleLE(0);
  const lng = buf.readDoubleLE(8);
  
  return Math.abs(lat - latitude) < 1e-10 &&
         Math.abs(lng - longitude) < 1e-10;
});

test('解析音频采样数据（WAV 文件格式）', () => {
  const samples = [-0.8, -0.4, 0.0, 0.4, 0.8];
  const buf = Buffer.alloc(samples.length * 8);
  samples.forEach((s, i) => buf.writeDoubleLE(s, i * 8));
  
  const decoded = samples.map((_, i) => buf.readDoubleLE(i * 8));
  return decoded.every((v, i) => Math.abs(v - samples[i]) < 1e-15);
});

// ============ 网络协议数据包 ============

test('解析网络数据包（自定义协议）', () => {
  const packet = Buffer.alloc(32);
  // Header
  packet.writeDoubleLE(1.0, 0);      // Protocol version
  packet.writeDoubleLE(1234.567, 8); // Timestamp
  packet.writeDoubleLE(999.999, 16); // Payload size
  packet.writeDoubleLE(0.95, 24);    // Confidence score
  
  const version = packet.readDoubleLE(0);
  const timestamp = packet.readDoubleLE(8);
  const size = packet.readDoubleLE(16);
  const confidence = packet.readDoubleLE(24);
  
  return version === 1.0 &&
         Math.abs(timestamp - 1234.567) < 0.001 &&
         Math.abs(size - 999.999) < 0.001 &&
         Math.abs(confidence - 0.95) < 0.01;
});

test('解析 JSON-RPC 二进制格式响应', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleLE(2.0, 0);        // JSON-RPC version
  buf.writeDoubleLE(12345, 8);      // Request ID
  buf.writeDoubleLE(200, 16);       // Status code
  
  return buf.readDoubleLE(0) === 2.0 &&
         buf.readDoubleLE(8) === 12345 &&
         buf.readDoubleLE(16) === 200;
});

// ============ 科学计算数据处理 ============

test('处理传感器数据流', () => {
  const sensorData = [
    { temp: 25.3, humidity: 60.5, pressure: 1013.25 },
    { temp: 26.1, humidity: 58.2, pressure: 1012.50 },
    { temp: 25.8, humidity: 59.0, pressure: 1013.00 }
  ];
  
  const buf = Buffer.alloc(sensorData.length * 24);
  sensorData.forEach((data, i) => {
    const offset = i * 24;
    buf.writeDoubleLE(data.temp, offset);
    buf.writeDoubleLE(data.humidity, offset + 8);
    buf.writeDoubleLE(data.pressure, offset + 16);
  });
  
  const parsed = [];
  for (let i = 0; i < sensorData.length; i++) {
    const offset = i * 24;
    parsed.push({
      temp: buf.readDoubleLE(offset),
      humidity: buf.readDoubleLE(offset + 8),
      pressure: buf.readDoubleLE(offset + 16)
    });
  }
  
  return parsed.every((p, i) => 
    Math.abs(p.temp - sensorData[i].temp) < 0.01 &&
    Math.abs(p.humidity - sensorData[i].humidity) < 0.01 &&
    Math.abs(p.pressure - sensorData[i].pressure) < 0.01
  );
});

test('处理统计数据（均值、方差、标准差）', () => {
  const stats = {
    mean: 25.5,
    variance: 2.3,
    stdDev: 1.51657508881
  };
  
  const buf = Buffer.alloc(24);
  buf.writeDoubleLE(stats.mean, 0);
  buf.writeDoubleLE(stats.variance, 8);
  buf.writeDoubleLE(stats.stdDev, 16);
  
  return Math.abs(buf.readDoubleLE(0) - stats.mean) < 0.01 &&
         Math.abs(buf.readDoubleLE(8) - stats.variance) < 0.01 &&
         Math.abs(buf.readDoubleLE(16) - stats.stdDev) < 1e-10;
});

// ============ 数据库和存储 ============

test('读取数据库行（二进制列）', () => {
  // 模拟数据库返回的二进制行数据
  const row = {
    id: 12345,
    price: 99.99,
    discount: 0.15,
    tax: 0.08
  };
  
  const buf = Buffer.alloc(32);
  buf.writeDoubleLE(row.id, 0);
  buf.writeDoubleLE(row.price, 8);
  buf.writeDoubleLE(row.discount, 16);
  buf.writeDoubleLE(row.tax, 24);
  
  return buf.readDoubleLE(0) === row.id &&
         Math.abs(buf.readDoubleLE(8) - row.price) < 0.01 &&
         Math.abs(buf.readDoubleLE(16) - row.discount) < 0.01 &&
         Math.abs(buf.readDoubleLE(24) - row.tax) < 0.01;
});

test('缓存序列化/反序列化', () => {
  const cacheData = [Math.PI, Math.E, Math.SQRT2, Math.LN2];
  const buf = Buffer.alloc(cacheData.length * 8);
  
  // 序列化
  cacheData.forEach((v, i) => buf.writeDoubleLE(v, i * 8));
  
  // 反序列化
  const restored = cacheData.map((_, i) => buf.readDoubleLE(i * 8));
  
  return restored.every((v, i) => v === cacheData[i]);
});

// ============ 金融计算 ============

test('处理金融交易数据', () => {
  const transaction = {
    amount: 12345.67,
    exchangeRate: 6.8523,
    fee: 0.0025,
    total: 12345.67 * 6.8523 * (1 + 0.0025)
  };
  
  const buf = Buffer.alloc(32);
  buf.writeDoubleLE(transaction.amount, 0);
  buf.writeDoubleLE(transaction.exchangeRate, 8);
  buf.writeDoubleLE(transaction.fee, 16);
  buf.writeDoubleLE(transaction.total, 24);
  
  const amount = buf.readDoubleLE(0);
  const rate = buf.readDoubleLE(8);
  const fee = buf.readDoubleLE(16);
  const total = buf.readDoubleLE(24);
  
  return Math.abs(amount - transaction.amount) < 0.01 &&
         Math.abs(rate - transaction.exchangeRate) < 0.0001 &&
         Math.abs(fee - transaction.fee) < 0.0001 &&
         Math.abs(total - transaction.total) < 0.01;
});

test('计算复利（compound interest）', () => {
  const principal = 10000;
  const rate = 0.05;
  const years = 10;
  const result = principal * Math.pow(1 + rate, years);
  
  const buf = Buffer.alloc(32);
  buf.writeDoubleLE(principal, 0);
  buf.writeDoubleLE(rate, 8);
  buf.writeDoubleLE(years, 16);
  buf.writeDoubleLE(result, 24);
  
  const p = buf.readDoubleLE(0);
  const r = buf.readDoubleLE(8);
  const y = buf.readDoubleLE(16);
  const res = buf.readDoubleLE(24);
  
  return p === principal && r === rate && y === years &&
         Math.abs(res - result) < 0.01;
});

// ============ 游戏开发 ============

test('读取 3D 坐标和向量', () => {
  const position = { x: 100.5, y: 200.3, z: 300.7 };
  const velocity = { x: 10.1, y: -5.2, z: 8.3 };
  
  const buf = Buffer.alloc(48);
  buf.writeDoubleLE(position.x, 0);
  buf.writeDoubleLE(position.y, 8);
  buf.writeDoubleLE(position.z, 16);
  buf.writeDoubleLE(velocity.x, 24);
  buf.writeDoubleLE(velocity.y, 32);
  buf.writeDoubleLE(velocity.z, 40);
  
  return Math.abs(buf.readDoubleLE(0) - position.x) < 0.01 &&
         Math.abs(buf.readDoubleLE(8) - position.y) < 0.01 &&
         Math.abs(buf.readDoubleLE(16) - position.z) < 0.01 &&
         Math.abs(buf.readDoubleLE(24) - velocity.x) < 0.01 &&
         Math.abs(buf.readDoubleLE(32) - velocity.y) < 0.01 &&
         Math.abs(buf.readDoubleLE(40) - velocity.z) < 0.01;
});

test('解析游戏状态快照', () => {
  const snapshot = {
    timestamp: Date.now(),
    playerHealth: 85.5,
    playerMana: 120.0,
    score: 99999
  };
  
  const buf = Buffer.alloc(32);
  buf.writeDoubleLE(snapshot.timestamp, 0);
  buf.writeDoubleLE(snapshot.playerHealth, 8);
  buf.writeDoubleLE(snapshot.playerMana, 16);
  buf.writeDoubleLE(snapshot.score, 24);
  
  return buf.readDoubleLE(0) === snapshot.timestamp &&
         Math.abs(buf.readDoubleLE(8) - snapshot.playerHealth) < 0.01 &&
         buf.readDoubleLE(16) === snapshot.playerMana &&
         buf.readDoubleLE(24) === snapshot.score;
});

// ============ 物联网（IoT）============

test('解析智能家居设备状态', () => {
  const deviceState = {
    temperature: 22.5,
    targetTemp: 24.0,
    powerConsumption: 1.25,  // kWh
    efficiency: 0.92
  };
  
  const buf = Buffer.alloc(32);
  buf.writeDoubleLE(deviceState.temperature, 0);
  buf.writeDoubleLE(deviceState.targetTemp, 8);
  buf.writeDoubleLE(deviceState.powerConsumption, 16);
  buf.writeDoubleLE(deviceState.efficiency, 24);
  
  return Math.abs(buf.readDoubleLE(0) - deviceState.temperature) < 0.01 &&
         Math.abs(buf.readDoubleLE(8) - deviceState.targetTemp) < 0.01 &&
         Math.abs(buf.readDoubleLE(16) - deviceState.powerConsumption) < 0.01 &&
         Math.abs(buf.readDoubleLE(24) - deviceState.efficiency) < 0.01;
});

// ============ 机器学习数据 ============

test('处理神经网络权重', () => {
  const weights = [0.123, -0.456, 0.789, -0.012, 0.345];
  const buf = Buffer.alloc(weights.length * 8);
  
  weights.forEach((w, i) => buf.writeDoubleLE(w, i * 8));
  
  const loaded = weights.map((_, i) => buf.readDoubleLE(i * 8));
  
  return loaded.every((w, i) => Math.abs(w - weights[i]) < 1e-15);
});

test('读取训练数据特征向量', () => {
  const features = [1.5, 2.3, 0.8, -1.2, 3.4, -0.5, 2.1, 1.8];
  const buf = Buffer.alloc(features.length * 8);
  
  features.forEach((f, i) => buf.writeDoubleLE(f, i * 8));
  
  let allMatch = true;
  for (let i = 0; i < features.length; i++) {
    if (buf.readDoubleLE(i * 8) !== features[i]) {
      allMatch = false;
      break;
    }
  }
  
  return allMatch;
});

// ============ 时间序列数据 ============

test('处理股票K线数据（OHLC）', () => {
  const candle = {
    open: 150.25,
    high: 152.80,
    low: 149.50,
    close: 151.75,
    volume: 1234567.89
  };
  
  const buf = Buffer.alloc(40);
  buf.writeDoubleLE(candle.open, 0);
  buf.writeDoubleLE(candle.high, 8);
  buf.writeDoubleLE(candle.low, 16);
  buf.writeDoubleLE(candle.close, 24);
  buf.writeDoubleLE(candle.volume, 32);
  
  return Math.abs(buf.readDoubleLE(0) - candle.open) < 0.01 &&
         Math.abs(buf.readDoubleLE(8) - candle.high) < 0.01 &&
         Math.abs(buf.readDoubleLE(16) - candle.low) < 0.01 &&
         Math.abs(buf.readDoubleLE(24) - candle.close) < 0.01 &&
         Math.abs(buf.readDoubleLE(32) - candle.volume) < 0.01;
});

// ============ 流式数据处理 ============

test('流式读取大量数据', () => {
  const dataSize = 1000;
  const buf = Buffer.alloc(dataSize * 8);
  
  // 写入
  for (let i = 0; i < dataSize; i++) {
    buf.writeDoubleLE(i * 0.1, i * 8);
  }
  
  // 流式读取
  let sum = 0;
  for (let i = 0; i < dataSize; i++) {
    sum += buf.readDoubleLE(i * 8);
  }
  
  const expectedSum = (dataSize - 1) * dataSize / 2 * 0.1;
  return Math.abs(sum - expectedSum) < 0.01;
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
