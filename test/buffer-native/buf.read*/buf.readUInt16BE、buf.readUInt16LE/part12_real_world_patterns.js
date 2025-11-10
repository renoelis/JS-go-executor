// 真实世界模式测试
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

// 文件格式魔数
test('BE: ZIP 文件头魔数 (PK)', () => {
  const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  return buf.readUInt16BE(0) === 0x504B;
});

test('LE: ZIP 文件头魔数 (PK)', () => {
  const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  return buf.readUInt16LE(0) === 0x4B50;
});

test('BE: PNG 文件头魔数', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  return buf.readUInt16BE(0) === 0x8950;
});

test('LE: PNG 文件头魔数', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  return buf.readUInt16LE(0) === 0x5089;
});

test('BE: GIF 文件头魔数 (GIF8)', () => {
  const buf = Buffer.from('GIF89a', 'ascii');
  return buf.readUInt16BE(0) === 0x4749;
});

test('LE: GIF 文件头魔数 (GIF8)', () => {
  const buf = Buffer.from('GIF89a', 'ascii');
  return buf.readUInt16LE(0) === 0x4947;
});

test('BE: JPEG 文件头魔数 (FFD8)', () => {
  const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  return buf.readUInt16BE(0) === 0xFFD8;
});

test('LE: JPEG 文件头魔数 (FFD8)', () => {
  const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  return buf.readUInt16LE(0) === 0xD8FF;
});

test('BE: PDF 文件头魔数 (%PDF)', () => {
  const buf = Buffer.from('%PDF', 'ascii');
  return buf.readUInt16BE(0) === 0x2550;
});

test('LE: PDF 文件头魔数 (%PDF)', () => {
  const buf = Buffer.from('%PDF', 'ascii');
  return buf.readUInt16LE(0) === 0x5025;
});

// 网络协议
test('BE: HTTP 端口 80', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(80, 0);
  return buf.readUInt16BE(0) === 80;
});

test('LE: HTTP 端口 80', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(80, 0);
  return buf.readUInt16LE(0) === 80;
});

test('BE: HTTPS 端口 443', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(443, 0);
  return buf.readUInt16BE(0) === 443;
});

test('LE: HTTPS 端口 443', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(443, 0);
  return buf.readUInt16LE(0) === 443;
});

test('BE: MySQL 端口 3306', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(3306, 0);
  return buf.readUInt16BE(0) === 3306;
});

test('LE: MySQL 端口 3306', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(3306, 0);
  return buf.readUInt16LE(0) === 3306;
});

// 音频格式
test('BE: WAV 文件格式标识', () => {
  const buf = Buffer.from('RIFF', 'ascii');
  return buf.readUInt16BE(0) === 0x5249;
});

test('LE: WAV 文件格式标识', () => {
  const buf = Buffer.from('RIFF', 'ascii');
  return buf.readUInt16LE(0) === 0x4952;
});

test('BE: 音频采样率 44100 Hz', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(44100, 0);
  return buf.readUInt16BE(2) === (44100 & 0xFFFF);
});

test('LE: 音频采样率 44100 Hz', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(44100, 0);
  return buf.readUInt16LE(0) === (44100 & 0xFFFF);
});

// 图像格式
test('BE: BMP 文件头魔数 (BM)', () => {
  const buf = Buffer.from('BM', 'ascii');
  return buf.readUInt16BE(0) === 0x424D;
});

test('LE: BMP 文件头魔数 (BM)', () => {
  const buf = Buffer.from('BM', 'ascii');
  return buf.readUInt16LE(0) === 0x4D42;
});

test('BE: 图像宽度 1920', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(1920, 0);
  return buf.readUInt16BE(0) === 1920;
});

test('LE: 图像宽度 1920', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(1920, 0);
  return buf.readUInt16LE(0) === 1920;
});

test('BE: 图像高度 1080', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(1080, 0);
  return buf.readUInt16BE(0) === 1080;
});

test('LE: 图像高度 1080', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(1080, 0);
  return buf.readUInt16LE(0) === 1080;
});

// UTF-16 编码
test('BE: UTF-16 BOM (Big Endian)', () => {
  const buf = Buffer.from([0xFE, 0xFF]);
  return buf.readUInt16BE(0) === 0xFEFF;
});

test('LE: UTF-16 BOM (Little Endian)', () => {
  const buf = Buffer.from([0xFF, 0xFE]);
  return buf.readUInt16LE(0) === 0xFEFF;
});

test('BE: UTF-16 字符 A', () => {
  const buf = Buffer.from([0x00, 0x41]);
  return buf.readUInt16BE(0) === 0x0041;
});

test('LE: UTF-16 字符 A', () => {
  const buf = Buffer.from([0x41, 0x00]);
  return buf.readUInt16LE(0) === 0x0041;
});

// 时间戳（毫秒部分）
test('BE: 时间戳毫秒部分', () => {
  const buf = Buffer.alloc(8);
  const timestamp = Date.now();
  buf.writeBigUInt64BE(BigInt(timestamp), 0);
  const ms = buf.readUInt16BE(6);
  return ms >= 0 && ms <= 65535;
});

test('LE: 时间戳毫秒部分', () => {
  const buf = Buffer.alloc(8);
  const timestamp = Date.now();
  buf.writeBigUInt64LE(BigInt(timestamp), 0);
  const ms = buf.readUInt16LE(0);
  return ms >= 0 && ms <= 65535;
});

// IP 数据包
test('BE: IP 数据包总长度字段', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt16BE(1500, 2);
  return buf.readUInt16BE(2) === 1500;
});

test('LE: IP 数据包总长度字段', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt16LE(1500, 2);
  return buf.readUInt16LE(2) === 1500;
});

// TCP 数据包
test('BE: TCP 源端口', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt16BE(12345, 0);
  return buf.readUInt16BE(0) === 12345;
});

test('LE: TCP 源端口', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt16LE(12345, 0);
  return buf.readUInt16LE(0) === 12345;
});

test('BE: TCP 目标端口', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt16BE(54321, 2);
  return buf.readUInt16BE(2) === 54321;
});

test('LE: TCP 目标端口', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt16LE(54321, 2);
  return buf.readUInt16LE(2) === 54321;
});

// 校验和
test('BE: IP 校验和', () => {
  const buf = Buffer.from([0x45, 0x00, 0x00, 0x3C]);
  const checksum = buf.readUInt16BE(0) + buf.readUInt16BE(2);
  return checksum > 0;
});

test('LE: IP 校验和', () => {
  const buf = Buffer.from([0x45, 0x00, 0x00, 0x3C]);
  const checksum = buf.readUInt16LE(0) + buf.readUInt16LE(2);
  return checksum > 0;
});

// 版本号
test('BE: 软件版本号 (major.minor)', () => {
  const buf = Buffer.alloc(2);
  const major = 3;
  const minor = 14;
  buf.writeUInt8(major, 0);
  buf.writeUInt8(minor, 1);
  const version = buf.readUInt16BE(0);
  return (version >> 8) === major && (version & 0xFF) === minor;
});

test('LE: 软件版本号 (major.minor)', () => {
  const buf = Buffer.alloc(2);
  const major = 3;
  const minor = 14;
  buf.writeUInt8(minor, 0);
  buf.writeUInt8(major, 1);
  const version = buf.readUInt16LE(0);
  return (version & 0xFF) === minor && (version >> 8) === major;
});

// CRC16 校验
test('BE: CRC16 校验值', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xABCD, 0);
  return buf.readUInt16BE(0) === 0xABCD;
});

test('LE: CRC16 校验值', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xABCD, 0);
  return buf.readUInt16LE(0) === 0xABCD;
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
