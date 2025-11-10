// 实际应用场景测试
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

// === 网络协议场景 ===

// 模拟读取网络包头（2字节长度 + 数据）
test('BE: 网络包头 - 2字节长度字段', () => {
  const buf = Buffer.from([0x00, 0x0A, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const length = buf.readUIntBE(0, 2);
  return length === 10;
});

test('LE: 网络包头 - 2字节长度字段', () => {
  const buf = Buffer.from([0x0A, 0x00, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const length = buf.readUIntLE(0, 2);
  return length === 10;
});

// 模拟读取 IPv4 地址（4字节）
test('BE: IPv4 地址 192.168.1.1', () => {
  const buf = Buffer.from([192, 168, 1, 1]);
  const ip = buf.readUIntBE(0, 4);
  return ip === 0xC0A80101;
});

test('LE: IPv4 地址 192.168.1.1', () => {
  const buf = Buffer.from([1, 1, 168, 192]);
  const ip = buf.readUIntLE(0, 4);
  return ip === 0xC0A80101;
});

// 模拟读取端口号（2字节）
test('BE: 端口号 8080', () => {
  const buf = Buffer.from([0x1F, 0x90]);
  return buf.readUIntBE(0, 2) === 8080;
});

test('LE: 端口号 8080', () => {
  const buf = Buffer.from([0x90, 0x1F]);
  return buf.readUIntLE(0, 2) === 8080;
});

// === 文件格式场景 ===

// 模拟读取文件魔数（4字节）
test('BE: PNG 文件魔数前4字节', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  return buf.readUIntBE(0, 4) === 0x89504E47;
});

test('LE: 文件大小字段（4字节）', () => {
  const buf = Buffer.from([0x00, 0x10, 0x00, 0x00]);
  return buf.readUIntLE(0, 4) === 4096;
});

// 模拟读取 BMP 文件大小（4字节）
test('BE: BMP 文件大小', () => {
  const buf = Buffer.from([0x00, 0x00, 0x04, 0x00]);
  return buf.readUIntBE(0, 4) === 1024;
});

test('LE: BMP 文件大小', () => {
  const buf = Buffer.from([0x00, 0x04, 0x00, 0x00]);
  return buf.readUIntLE(0, 4) === 1024;
});

// === 数据库记录场景 ===

// 模拟读取记录ID（3字节）
test('BE: 数据库记录ID - 3字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01]);
  return buf.readUIntBE(0, 3) === 1;
});

test('LE: 数据库记录ID - 3字节', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00]);
  return buf.readUIntLE(0, 3) === 1;
});

// 模拟读取时间戳（6字节，毫秒）
test('BE: 时间戳 - 6字节', () => {
  const buf = Buffer.from([0x01, 0x8B, 0xCF, 0xE5, 0x68, 0x00]);
  return buf.readUIntBE(0, 6) === 1700000000000;
});

test('LE: 时间戳 - 6字节', () => {
  const buf = Buffer.from([0x00, 0x68, 0xE5, 0xCF, 0x8B, 0x01]);
  return buf.readUIntLE(0, 6) === 1700000000000;
});

// === 传感器数据场景 ===

// 模拟读取温度传感器数据（2字节，单位0.01度）
test('BE: 温度传感器 25.50度', () => {
  const buf = Buffer.from([0x09, 0xF6]);
  const temp = buf.readUIntBE(0, 2);
  return temp === 2550;
});

test('LE: 温度传感器 25.50度', () => {
  const buf = Buffer.from([0xF6, 0x09]);
  const temp = buf.readUIntLE(0, 2);
  return temp === 2550;
});

// 模拟读取压力传感器数据（3字节）
test('BE: 压力传感器 - 3字节', () => {
  const buf = Buffer.from([0x01, 0x86, 0xA0]);
  return buf.readUIntBE(0, 3) === 100000;
});

test('LE: 压力传感器 - 3字节', () => {
  const buf = Buffer.from([0xA0, 0x86, 0x01]);
  return buf.readUIntLE(0, 3) === 100000;
});

// === 序列化数据场景 ===

// 模拟读取消息长度前缀（1字节）
test('BE: 消息长度 - 1字节', () => {
  const buf = Buffer.from([0x0F, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return buf.readUIntBE(0, 1) === 15;
});

test('LE: 消息长度 - 1字节', () => {
  const buf = Buffer.from([0x0F, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return buf.readUIntLE(0, 1) === 15;
});

// 模拟读取版本号（3字节：major.minor.patch）
test('BE: 版本号 1.2.3', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  return buf.readUIntBE(0, 3) === 0x010203;
});

test('LE: 版本号 1.2.3', () => {
  const buf = Buffer.from([0x03, 0x02, 0x01]);
  return buf.readUIntLE(0, 3) === 0x010203;
});

// === 多字段连续读取 ===

test('BE: 连续读取多个字段', () => {
  const buf = Buffer.from([
    0x00, 0x0A,           // 2字节：长度 = 10
    0x00, 0x00, 0x00, 0x01, // 4字节：ID = 1
    0x05                  // 1字节：类型 = 5
  ]);
  const length = buf.readUIntBE(0, 2);
  const id = buf.readUIntBE(2, 4);
  const type = buf.readUIntBE(6, 1);
  return length === 10 && id === 1 && type === 5;
});

test('LE: 连续读取多个字段', () => {
  const buf = Buffer.from([
    0x0A, 0x00,           // 2字节：长度 = 10
    0x01, 0x00, 0x00, 0x00, // 4字节：ID = 1
    0x05                  // 1字节：类型 = 5
  ]);
  const length = buf.readUIntLE(0, 2);
  const id = buf.readUIntLE(2, 4);
  const type = buf.readUIntLE(6, 1);
  return length === 10 && id === 1 && type === 5;
});

// === 位掩码场景 ===

test('BE: 读取标志位（1字节）', () => {
  const buf = Buffer.from([0b10101010]);
  return buf.readUIntBE(0, 1) === 170;
});

test('LE: 读取标志位（1字节）', () => {
  const buf = Buffer.from([0b10101010]);
  return buf.readUIntLE(0, 1) === 170;
});

test('BE: 读取标志位（2字节）', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readUIntBE(0, 2) === 0xFF00;
});

test('LE: 读取标志位（2字节）', () => {
  const buf = Buffer.from([0x00, 0xFF]);
  return buf.readUIntLE(0, 2) === 0xFF00;
});

// === 计数器场景 ===

test('BE: 计数器值 - 4字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x03, 0xE8]);
  return buf.readUIntBE(0, 4) === 1000;
});

test('LE: 计数器值 - 4字节', () => {
  const buf = Buffer.from([0xE8, 0x03, 0x00, 0x00]);
  return buf.readUIntLE(0, 4) === 1000;
});

test('BE: 大计数器值 - 6字节', () => {
  const buf = Buffer.from([0x00, 0xE8, 0xD4, 0xA5, 0x10, 0x00]);
  return buf.readUIntBE(0, 6) === 1000000000000;
});

test('LE: 大计数器值 - 6字节', () => {
  const buf = Buffer.from([0x00, 0x10, 0xA5, 0xD4, 0xE8, 0x00]);
  return buf.readUIntLE(0, 6) === 1000000000000;
});

// === 校验和场景 ===

test('BE: CRC16 校验和', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUIntBE(0, 2) === 0x1234;
});

test('LE: CRC16 校验和', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readUIntLE(0, 2) === 0x1234;
});

test('BE: CRC32 校验和', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUIntBE(0, 4) === 0x12345678;
});

test('LE: CRC32 校验和', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readUIntLE(0, 4) === 0x12345678;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
