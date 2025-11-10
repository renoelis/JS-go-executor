// buf.readUInt8() - 高级场景测试
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

// UTF-8 编码字节读取
test('读取 UTF-8 编码的中文字符首字节', () => {
  const buf = Buffer.from('中', 'utf8');
  // '中' 的 UTF-8 编码是 E4 B8 AD
  return buf.readUInt8(0) === 0xE4;
});

test('读取 UTF-8 编码的 emoji 首字节', () => {
  const buf = Buffer.from('😀', 'utf8');
  // emoji 的 UTF-8 编码首字节是 0xF0
  return buf.readUInt8(0) === 0xF0;
});

// Base64 解码后读取
test('Base64 解码后读取特定字节', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  // 'H' = 72, 'e' = 101, 'l' = 108, 'l' = 108, 'o' = 111
  return buf.readUInt8(0) === 72 && buf.readUInt8(1) === 101;
});

// Hex 解码后读取
test('Hex 解码后读取', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  return buf.readUInt8(0) === 0x48 && buf.readUInt8(4) === 0x6f;
});

// 大小端相关（虽然 readUInt8 不涉及字节序，但测试理解）
test('readUInt8 不受字节序影响', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  // 无论大小端，readUInt8(0) 都应该返回 0xAB
  return buf.readUInt8(0) === 0xAB && buf.readUInt8(1) === 0xCD;
});

// 与 16 位读取对比
test('readUInt8 vs readUInt16LE 低字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const u8 = buf.readUInt8(0);
  const u16 = buf.readUInt16LE(0);
  // u8 应该是 0x12，u16 应该是 0x3412
  return u8 === 0x12 && u16 === 0x3412;
});

test('readUInt8 vs readUInt16BE 高字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const u8_0 = buf.readUInt8(0);
  const u8_1 = buf.readUInt8(1);
  const u16 = buf.readUInt16BE(0);
  // u16 应该是 0x1234
  return u8_0 === 0x12 && u8_1 === 0x34 && u16 === 0x1234;
});

// Buffer 修改后立即读取
test('writeUInt8 后立即 readUInt8', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(200, 0);
  return buf.readUInt8(0) === 200;
});

test('多次 write 后读取最后写入的值', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(100, 0);
  buf.writeUInt8(150, 0);
  buf.writeUInt8(200, 0);
  return buf.readUInt8(0) === 200;
});

// 跨越不同 TypedArray 视图
test('通过 Uint8Array 修改后 Buffer 读取', () => {
  const ab = new ArrayBuffer(3);
  const u8 = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  u8[0] = 100;
  u8[1] = 200;
  // Buffer 和 Uint8Array 共享内存
  return buf.readUInt8(0) === 100 && buf.readUInt8(1) === 200;
});

test('通过 DataView 修改后 Buffer 读取', () => {
  const ab = new ArrayBuffer(3);
  const dv = new DataView(ab);
  const buf = Buffer.from(ab);
  dv.setUint8(0, 123);
  dv.setUint8(1, 234);
  return buf.readUInt8(0) === 123 && buf.readUInt8(1) === 234;
});

// 循环缓冲区模拟
test('模拟循环读取（读取后移动指针）', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const results = [];
  for (let offset = 0; offset < buf.length; offset++) {
    results.push(buf.readUInt8(offset));
  }
  return results.length === 5 && 
         results[0] === 10 && 
         results[4] === 50;
});

// 稀疏数据测试
test('读取稀疏模式数据（只有偶数位有值）', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(255, 0);
  buf.writeUInt8(255, 2);
  buf.writeUInt8(255, 4);
  buf.writeUInt8(255, 6);
  buf.writeUInt8(255, 8);
  return buf.readUInt8(0) === 255 &&
         buf.readUInt8(1) === 0 &&
         buf.readUInt8(2) === 255 &&
         buf.readUInt8(3) === 0;
});

// 掩码和位运算验证
test('验证位掩码（读取后进行位运算）', () => {
  const buf = Buffer.from([0b11110000]);
  const value = buf.readUInt8(0);
  const highNibble = (value >> 4) & 0x0F;
  const lowNibble = value & 0x0F;
  return highNibble === 0x0F && lowNibble === 0x00;
});

test('验证位操作（读取后提取特定位）', () => {
  const buf = Buffer.from([0b10101010]);
  const value = buf.readUInt8(0);
  const bit7 = (value >> 7) & 1;
  const bit0 = value & 1;
  return value === 170 && bit7 === 1 && bit0 === 0;
});

// 压缩数据头部读取
test('读取模拟压缩数据的魔数', () => {
  // ZIP 文件头 PK (0x50, 0x4B)
  const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  return buf.readUInt8(0) === 0x50 && buf.readUInt8(1) === 0x4B;
});

test('读取模拟 PNG 文件头', () => {
  // PNG 签名: 137 80 78 71 13 10 26 10
  const buf = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return buf.readUInt8(0) === 137 && 
         buf.readUInt8(1) === 80 && 
         buf.readUInt8(2) === 78 && 
         buf.readUInt8(3) === 71;
});

// 颜色值读取（RGB）
test('读取 RGB 颜色值', () => {
  // 红色 (255, 0, 0)
  const buf = Buffer.from([255, 0, 0]);
  return buf.readUInt8(0) === 255 && 
         buf.readUInt8(1) === 0 && 
         buf.readUInt8(2) === 0;
});

test('读取 RGBA 颜色值', () => {
  // 半透明蓝色 (0, 0, 255, 128)
  const buf = Buffer.from([0, 0, 255, 128]);
  return buf.readUInt8(0) === 0 && 
         buf.readUInt8(1) === 0 && 
         buf.readUInt8(2) === 255 && 
         buf.readUInt8(3) === 128;
});

// IP 地址字节读取
test('读取 IPv4 地址字节', () => {
  // 192.168.1.1
  const buf = Buffer.from([192, 168, 1, 1]);
  return buf.readUInt8(0) === 192 && 
         buf.readUInt8(1) === 168 && 
         buf.readUInt8(2) === 1 && 
         buf.readUInt8(3) === 1;
});

// MAC 地址字节读取
test('读取 MAC 地址字节', () => {
  // AA:BB:CC:DD:EE:FF
  const buf = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
  return buf.readUInt8(0) === 0xAA && 
         buf.readUInt8(5) === 0xFF;
});

// 版本号读取
test('读取版本号字节（major.minor.patch）', () => {
  const buf = Buffer.from([1, 2, 3]); // 版本 1.2.3
  return buf.readUInt8(0) === 1 && 
         buf.readUInt8(1) === 2 && 
         buf.readUInt8(2) === 3;
});

// 时间戳部分字节读取
test('读取时间戳的单个字节', () => {
  const timestamp = Date.now();
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(timestamp), 0);
  // 只测试能否读取，不验证具体值
  return typeof buf.readUInt8(0) === 'number' && 
         buf.readUInt8(0) >= 0 && 
         buf.readUInt8(0) <= 255;
});

// 校验和计算准备
test('读取所有字节计算简单校验和', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    sum += buf.readUInt8(i);
  }
  return sum === 150; // 10+20+30+40+50 = 150
});

test('读取并验证异或校验', () => {
  const buf = Buffer.from([0xFF, 0xAA, 0x55, 0x00]);
  let xor = 0;
  for (let i = 0; i < buf.length; i++) {
    xor ^= buf.readUInt8(i);
  }
  return xor === 0; // 0xFF ^ 0xAA ^ 0x55 ^ 0x00 = 0x00
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
