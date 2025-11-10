// 高级场景测试
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
test('BE: UTF-8 中文字符字节', () => {
  const buf = Buffer.from('中', 'utf8');
  return buf.length === 3 && buf.readUInt16BE(0) === 0xE4B8;
});

test('LE: UTF-8 中文字符字节', () => {
  const buf = Buffer.from('中', 'utf8');
  return buf.length === 3 && buf.readUInt16LE(0) === 0xB8E4;
});

// Base64 解码后读取
test('BE: Base64 解码后读取', () => {
  const buf = Buffer.from('ABCD', 'base64');
  return buf.readUInt16BE(0) === 0x0010;
});

test('LE: Base64 解码后读取', () => {
  const buf = Buffer.from('ABCD', 'base64');
  return buf.readUInt16LE(0) === 0x1000;
});

// Hex 解码后读取
test('BE: Hex 解码后读取', () => {
  const buf = Buffer.from('ABCDEF', 'hex');
  return buf.readUInt16BE(0) === 0xABCD && buf.readUInt16BE(1) === 0xCDEF;
});

test('LE: Hex 解码后读取', () => {
  const buf = Buffer.from('ABCDEF', 'hex');
  return buf.readUInt16LE(0) === 0xCDAB && buf.readUInt16LE(1) === 0xEFCD;
});

// 与 32 位读取对比
test('BE: 与 readUInt32BE 对比', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v16_1 = buf.readUInt16BE(0);
  const v16_2 = buf.readUInt16BE(2);
  const v32 = buf.readUInt32BE(0);
  return v32 === (v16_1 << 16) + v16_2;
});

test('LE: 与 readUInt32LE 对比', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v16_1 = buf.readUInt16LE(0);
  const v16_2 = buf.readUInt16LE(2);
  const v32 = buf.readUInt32LE(0);
  return v32 === v16_1 + (v16_2 << 16);
});

// Buffer 修改后立即读取
test('BE: 修改后立即读取', () => {
  const buf = Buffer.from([0x00, 0x00]);
  buf[0] = 0xAB;
  buf[1] = 0xCD;
  return buf.readUInt16BE(0) === 0xABCD;
});

test('LE: 修改后立即读取', () => {
  const buf = Buffer.from([0x00, 0x00]);
  buf[0] = 0xAB;
  buf[1] = 0xCD;
  return buf.readUInt16LE(0) === 0xCDAB;
});

// 跨 DataView 视图
test('BE: DataView 与 Buffer 一致性', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint16(0, 0x1234, false);
  const buf = Buffer.from(ab);
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: DataView 与 Buffer 一致性', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint16(0, 0x1234, true);
  const buf = Buffer.from(ab);
  return buf.readUInt16LE(0) === 0x1234;
});

// 循环缓冲区模拟
test('BE: 循环读取模式', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  let sum = 0;
  for (let i = 0; i < buf.length - 1; i++) {
    sum += buf.readUInt16BE(i);
  }
  return sum === 0x1234 + 0x3456 + 0x5678 + 0x789A + 0x9ABC;
});

test('LE: 循环读取模式', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  let sum = 0;
  for (let i = 0; i < buf.length - 1; i++) {
    sum += buf.readUInt16LE(i);
  }
  return sum === 0x3412 + 0x5634 + 0x7856 + 0x9A78 + 0xBC9A;
});

// 位运算验证
test('BE: 位运算提取高低字节', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  const val = buf.readUInt16BE(0);
  const high = (val >> 8) & 0xFF;
  const low = val & 0xFF;
  return high === 0xAB && low === 0xCD;
});

test('LE: 位运算提取高低字节', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  const val = buf.readUInt16LE(0);
  const low = val & 0xFF;
  const high = (val >> 8) & 0xFF;
  return low === 0xAB && high === 0xCD;
});

// 文件格式魔数（PNG）
test('BE: PNG 文件头部分', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  return buf.readUInt16BE(0) === 0x8950 && buf.readUInt16BE(2) === 0x4E47;
});

test('LE: PNG 文件头部分', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  return buf.readUInt16LE(0) === 0x5089 && buf.readUInt16LE(2) === 0x474E;
});

// 颜色值读取（RGB565）
test('BE: RGB565 颜色值', () => {
  const buf = Buffer.from([0xF8, 0x00]);
  const val = buf.readUInt16BE(0);
  const r = (val >> 11) & 0x1F;
  const g = (val >> 5) & 0x3F;
  const b = val & 0x1F;
  return r === 31 && g === 0 && b === 0;
});

test('LE: RGB565 颜色值', () => {
  const buf = Buffer.from([0x00, 0xF8]);
  const val = buf.readUInt16LE(0);
  const r = (val >> 11) & 0x1F;
  const g = (val >> 5) & 0x3F;
  const b = val & 0x1F;
  return r === 31 && g === 0 && b === 0;
});

// 网络端口号
test('BE: 网络端口号读取', () => {
  const buf = Buffer.from([0x1F, 0x90]);
  return buf.readUInt16BE(0) === 8080;
});

test('LE: 网络端口号读取', () => {
  const buf = Buffer.from([0x90, 0x1F]);
  return buf.readUInt16LE(0) === 8080;
});

// 版本号读取
test('BE: 版本号读取 (major.minor)', () => {
  const buf = Buffer.from([0x01, 0x05]);
  const version = buf.readUInt16BE(0);
  const major = version >> 8;
  const minor = version & 0xFF;
  return major === 1 && minor === 5;
});

test('LE: 版本号读取 (major.minor)', () => {
  const buf = Buffer.from([0x05, 0x01]);
  const version = buf.readUInt16LE(0);
  const minor = version & 0xFF;
  const major = version >> 8;
  return major === 1 && minor === 5;
});

// 校验和计算
test('BE: 简单校验和', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sum = buf.readUInt16BE(0) + buf.readUInt16BE(2);
  return sum === 0x1234 + 0x5678;
});

test('LE: 简单校验和', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sum = buf.readUInt16LE(0) + buf.readUInt16LE(2);
  return sum === 0x3412 + 0x7856;
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
