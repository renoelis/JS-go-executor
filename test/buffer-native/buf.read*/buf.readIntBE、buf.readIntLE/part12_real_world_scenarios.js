// buf.readIntBE/readIntLE - 真实世界应用场景测试
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

test('解析二进制整数数组（大端序）', () => {
  // 模拟从文件读取的二进制数据
  const values = [100, -200, 300, -400, 500];
  const buf = Buffer.alloc(values.length * 3);
  values.forEach((v, i) => buf.writeIntBE(v, i * 3, 3));
  
  // 解析
  const parsed = [];
  for (let i = 0; i < values.length; i++) {
    parsed.push(buf.readIntBE(i * 3, 3));
  }
  
  return parsed.every((v, i) => v === values[i]);
});

test('解析图像元数据（EXIF 偏移量）', () => {
  const buf = Buffer.alloc(12);
  const ifdOffset = 0x123456;  // IFD 偏移
  const thumbOffset = 0x789ABC; // 缩略图偏移
  buf.writeIntBE(ifdOffset, 0, 3);
  buf.writeIntBE(thumbOffset, 3, 3);
  
  const ifd = buf.readIntBE(0, 3);
  const thumb = buf.readIntBE(3, 3);
  
  return ifd === ifdOffset && thumb === thumbOffset;
});

test('解析音频采样数据（24-bit PCM）', () => {
  // 24-bit 音频样本
  const samples = [0x7FFFFF, -0x800000, 0x123456, -0x654321];
  const buf = Buffer.alloc(samples.length * 3);
  samples.forEach((s, i) => buf.writeIntBE(s, i * 3, 3));
  
  const decoded = samples.map((_, i) => buf.readIntBE(i * 3, 3));
  return decoded.every((v, i) => v === samples[i]);
});

// ============ 网络协议数据包 ============

test('解析网络数据包头部（自定义协议）', () => {
  const packet = Buffer.alloc(16);
  // Header: version(2) + sequence(4) + flags(2) + payload_size(4)
  packet.writeIntBE(1, 0, 2);      // Version
  packet.writeIntBE(12345, 2, 4);  // Sequence number
  packet.writeIntBE(-1, 6, 2);     // Flags (all set)
  packet.writeIntBE(1024, 8, 4);   // Payload size
  
  const version = packet.readIntBE(0, 2);
  const seq = packet.readIntBE(2, 4);
  const flags = packet.readIntBE(6, 2);
  const size = packet.readIntBE(8, 4);
  
  return version === 1 && seq === 12345 && flags === -1 && size === 1024;
});

test('解析 MQTT 固定头部', () => {
  const buf = Buffer.alloc(5);
  buf.writeIntBE(0x30, 0, 1);      // Message type & flags
  buf.writeIntBE(0x7F, 1, 1);      // Remaining length
  buf.writeIntBE(0x1234, 2, 2);    // Packet ID
  
  const type = buf.readIntBE(0, 1);
  const len = buf.readIntBE(1, 1);
  const packetId = buf.readIntBE(2, 2);
  
  return type === 0x30 && len === 0x7F && packetId === 0x1234;
});

// ============ 游戏数据处理 ============

test('处理游戏状态数据', () => {
  const gameState = {
    playerId: 12345,
    score: -500,  // 可以是负数
    level: 10,
    coins: 9999
  };
  
  const buf = Buffer.alloc(14);
  buf.writeIntBE(gameState.playerId, 0, 4);
  buf.writeIntBE(gameState.score, 4, 3);
  buf.writeIntBE(gameState.level, 7, 2);
  buf.writeIntBE(gameState.coins, 9, 4);
  
  return buf.readIntBE(0, 4) === gameState.playerId &&
         buf.readIntBE(4, 3) === gameState.score &&
         buf.readIntBE(7, 2) === gameState.level &&
         buf.readIntBE(9, 4) === gameState.coins;
});

test('解析地图坐标（小端序）', () => {
  const coords = { x: -128, y: 256, z: 0 };
  const buf = Buffer.alloc(6);
  buf.writeIntLE(coords.x, 0, 2);
  buf.writeIntLE(coords.y, 2, 2);
  buf.writeIntLE(coords.z, 4, 2);
  
  return buf.readIntLE(0, 2) === coords.x &&
         buf.readIntLE(2, 2) === coords.y &&
         buf.readIntLE(4, 2) === coords.z;
});

// ============ 数据库记录格式 ============

test('解析数据库记录（变长整数）', () => {
  const record = Buffer.alloc(15);
  record.writeIntBE(1001, 0, 2);    // Record ID
  record.writeIntBE(-999, 2, 3);    // Balance (可能为负)
  record.writeIntBE(20231109, 5, 4); // Timestamp
  record.writeIntBE(0x123456, 9, 3); // User ID
  
  return record.readIntBE(0, 2) === 1001 &&
         record.readIntBE(2, 3) === -999 &&
         record.readIntBE(5, 4) === 20231109 &&
         record.readIntBE(9, 3) === 0x123456;
});

// ============ 传感器数据流 ============

test('处理传感器读数（16-bit 有符号）', () => {
  const readings = [-32768, -100, 0, 100, 32767];
  const buf = Buffer.alloc(readings.length * 2);
  readings.forEach((r, i) => buf.writeIntLE(r, i * 2, 2));
  
  const decoded = readings.map((_, i) => buf.readIntLE(i * 2, 2));
  return decoded.every((v, i) => v === readings[i]);
});

test('解析加速度计数据（3轴，48-bit）', () => {
  const accel = {
    x: 0x123456789ABC,
    y: -0x123456789ABC,
    z: 0
  };
  
  const buf = Buffer.alloc(18);
  buf.writeIntBE(accel.x, 0, 6);
  buf.writeIntBE(accel.y, 6, 6);
  buf.writeIntBE(accel.z, 12, 6);
  
  return buf.readIntBE(0, 6) === accel.x &&
         buf.readIntBE(6, 6) === accel.y &&
         buf.readIntBE(12, 6) === accel.z;
});

// ============ 压缩数据头部 ============

test('解析压缩文件头部（gzip风格）', () => {
  const header = Buffer.alloc(10);
  header.writeIntBE(0x1F8B, 0, 2);    // Magic number
  header.writeIntBE(8, 2, 1);         // Compression method
  header.writeIntBE(0, 3, 1);         // Flags
  header.writeIntBE(1699564800, 4, 4); // Timestamp
  
  const magic = header.readIntBE(0, 2);
  const method = header.readIntBE(2, 1);
  const flags = header.readIntBE(3, 1);
  const mtime = header.readIntBE(4, 4);
  
  return magic === 0x1F8B && method === 8 && flags === 0 && mtime === 1699564800;
});

// ============ 流式数据解析 ============

test('流式解析可变长度记录', () => {
  // 模拟流数据：[length][data][length][data]...
  const data = [
    { len: 4, value: 1000 },
    { len: 3, value: -500 },
    { len: 2, value: 100 }
  ];
  
  let bufSize = 0;
  data.forEach(d => bufSize += 1 + d.len); // 1 byte for length + data
  
  const buf = Buffer.alloc(bufSize);
  let offset = 0;
  data.forEach(d => {
    buf.writeIntBE(d.len, offset, 1);
    buf.writeIntBE(d.value, offset + 1, d.len);
    offset += 1 + d.len;
  });
  
  // 解析
  offset = 0;
  const parsed = [];
  while (offset < buf.length) {
    const len = buf.readIntBE(offset, 1);
    const value = buf.readIntBE(offset + 1, len);
    parsed.push({ len, value });
    offset += 1 + len;
  }
  
  return parsed.length === data.length &&
         parsed.every((p, i) => p.len === data[i].len && p.value === data[i].value);
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
