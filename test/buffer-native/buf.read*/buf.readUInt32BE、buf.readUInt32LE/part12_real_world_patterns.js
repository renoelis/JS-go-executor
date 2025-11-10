// 真实世界模式测试 - 32位无符号整数
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
test('BE: ELF 文件头魔数 (0x7F454C46)', () => {
  const buf = Buffer.from([0x7F, 0x45, 0x4C, 0x46]);
  return buf.readUInt32BE(0) === 0x7F454C46;
});

test('LE: ELF 文件头魔数 (0x7F454C46)', () => {
  const buf = Buffer.from([0x46, 0x4C, 0x45, 0x7F]);
  return buf.readUInt32LE(0) === 0x7F454C46;
});

test('BE: PE 文件头魔数 (MZ)', () => {
  const buf = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);
  return buf.readUInt32BE(0) === 0x4D5A9000;
});

test('LE: PE 文件头魔数 (MZ)', () => {
  const buf = Buffer.from([0x00, 0x90, 0x5A, 0x4D]);
  return buf.readUInt32LE(0) === 0x4D5A9000;
});

test('BE: Mach-O 魔数 (0xFEEDFACE)', () => {
  const buf = Buffer.from([0xFE, 0xED, 0xFA, 0xCE]);
  return buf.readUInt32BE(0) === 0xFEEDFACE;
});

test('LE: Mach-O 魔数 (0xFEEDFACE)', () => {
  const buf = Buffer.from([0xCE, 0xFA, 0xED, 0xFE]);
  return buf.readUInt32LE(0) === 0xFEEDFACE;
});

test('BE: Java Class 文件魔数 (0xCAFEBABE)', () => {
  const buf = Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]);
  return buf.readUInt32BE(0) === 0xCAFEBABE;
});

test('LE: Java Class 文件魔数 (0xCAFEBABE)', () => {
  const buf = Buffer.from([0xBE, 0xBA, 0xFE, 0xCA]);
  return buf.readUInt32LE(0) === 0xCAFEBABE;
});

// 网络协议
test('BE: IPv4 地址 192.168.1.1', () => {
  const buf = Buffer.from([192, 168, 1, 1]);
  return buf.readUInt32BE(0) === 0xC0A80101;
});

test('LE: IPv4 地址 192.168.1.1', () => {
  const buf = Buffer.from([1, 1, 168, 192]);
  return buf.readUInt32LE(0) === 0xC0A80101;
});

test('BE: IPv4 地址 127.0.0.1 (localhost)', () => {
  const buf = Buffer.from([127, 0, 0, 1]);
  return buf.readUInt32BE(0) === 0x7F000001;
});

test('LE: IPv4 地址 127.0.0.1 (localhost)', () => {
  const buf = Buffer.from([1, 0, 0, 127]);
  return buf.readUInt32LE(0) === 0x7F000001;
});

test('BE: IPv4 地址 255.255.255.255 (broadcast)', () => {
  const buf = Buffer.from([255, 255, 255, 255]);
  return buf.readUInt32BE(0) === 0xFFFFFFFF;
});

test('LE: IPv4 地址 255.255.255.255 (broadcast)', () => {
  const buf = Buffer.from([255, 255, 255, 255]);
  return buf.readUInt32LE(0) === 0xFFFFFFFF;
});

// 时间戳
test('BE: Unix 时间戳 (2000-01-01)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(946684800, 0);
  return buf.readUInt32BE(0) === 946684800;
});

test('LE: Unix 时间戳 (2000-01-01)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(946684800, 0);
  return buf.readUInt32LE(0) === 946684800;
});

test('BE: Unix 时间戳 (2020-01-01)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(1577836800, 0);
  return buf.readUInt32BE(0) === 1577836800;
});

test('LE: Unix 时间戳 (2020-01-01)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(1577836800, 0);
  return buf.readUInt32LE(0) === 1577836800;
});

test('BE: Unix 时间戳 (2038-01-19 溢出前)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2147483647, 0);
  return buf.readUInt32BE(0) === 2147483647;
});

test('LE: Unix 时间戳 (2038-01-19 溢出前)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2147483647, 0);
  return buf.readUInt32LE(0) === 2147483647;
});

// 文件大小
test('BE: 文件大小 1GB', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(1073741824, 0);
  return buf.readUInt32BE(0) === 1073741824;
});

test('LE: 文件大小 1GB', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(1073741824, 0);
  return buf.readUInt32LE(0) === 1073741824;
});

test('BE: 文件大小 4GB - 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(4294967295, 0);
  return buf.readUInt32BE(0) === 4294967295;
});

test('LE: 文件大小 4GB - 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(4294967295, 0);
  return buf.readUInt32LE(0) === 4294967295;
});

// CRC32 校验和
test('BE: CRC32 校验和', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0x12345678, 0);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: CRC32 校验和', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0x12345678, 0);
  return buf.readUInt32LE(0) === 0x12345678;
});

test('BE: CRC32 全1校验', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0xFFFFFFFF, 0);
  return buf.readUInt32BE(0) === 0xFFFFFFFF;
});

test('LE: CRC32 全1校验', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0xFFFFFFFF, 0);
  return buf.readUInt32LE(0) === 0xFFFFFFFF;
});

// 颜色值 (RGBA)
test('BE: RGBA 颜色 (255, 128, 64, 255)', () => {
  const buf = Buffer.from([255, 128, 64, 255]);
  return buf.readUInt32BE(0) === 0xFF8040FF;
});

test('LE: RGBA 颜色 (255, 128, 64, 255)', () => {
  const buf = Buffer.from([255, 64, 128, 255]);
  return buf.readUInt32LE(0) === 0xFF8040FF;
});

test('BE: RGBA 白色 (255, 255, 255, 255)', () => {
  const buf = Buffer.from([255, 255, 255, 255]);
  return buf.readUInt32BE(0) === 0xFFFFFFFF;
});

test('LE: RGBA 白色 (255, 255, 255, 255)', () => {
  const buf = Buffer.from([255, 255, 255, 255]);
  return buf.readUInt32LE(0) === 0xFFFFFFFF;
});

test('BE: RGBA 黑色 (0, 0, 0, 255)', () => {
  const buf = Buffer.from([0, 0, 0, 255]);
  return buf.readUInt32BE(0) === 0x000000FF;
});

test('LE: RGBA 黑色 (0, 0, 0, 255)', () => {
  const buf = Buffer.from([255, 0, 0, 0]);
  return buf.readUInt32LE(0) === 0x000000FF;
});

// 序列号
test('BE: 设备序列号', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(123456789, 0);
  return buf.readUInt32BE(0) === 123456789;
});

test('LE: 设备序列号', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(123456789, 0);
  return buf.readUInt32LE(0) === 123456789;
});

// 音频采样率
test('BE: 音频采样率 44100 Hz', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(44100, 0);
  return buf.readUInt32BE(0) === 44100;
});

test('LE: 音频采样率 44100 Hz', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(44100, 0);
  return buf.readUInt32LE(0) === 44100;
});

test('BE: 音频采样率 48000 Hz', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(48000, 0);
  return buf.readUInt32BE(0) === 48000;
});

test('LE: 音频采样率 48000 Hz', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(48000, 0);
  return buf.readUInt32LE(0) === 48000;
});

test('BE: 音频采样率 96000 Hz', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(96000, 0);
  return buf.readUInt32BE(0) === 96000;
});

test('LE: 音频采样率 96000 Hz', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(96000, 0);
  return buf.readUInt32LE(0) === 96000;
});

// 视频帧数
test('BE: 视频总帧数 (30fps * 60s)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(1800, 0);
  return buf.readUInt32BE(0) === 1800;
});

test('LE: 视频总帧数 (30fps * 60s)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(1800, 0);
  return buf.readUInt32LE(0) === 1800;
});

// 数据包序列号
test('BE: TCP 序列号', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(1000000, 0);
  return buf.readUInt32BE(0) === 1000000;
});

test('LE: TCP 序列号', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(1000000, 0);
  return buf.readUInt32LE(0) === 1000000;
});

test('BE: TCP 确认号', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2000000, 0);
  return buf.readUInt32BE(0) === 2000000;
});

test('LE: TCP 确认号', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2000000, 0);
  return buf.readUInt32LE(0) === 2000000;
});

// 内存地址
test('BE: 32位内存地址', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0x08048000, 0);
  return buf.readUInt32BE(0) === 0x08048000;
});

test('LE: 32位内存地址', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0x08048000, 0);
  return buf.readUInt32LE(0) === 0x08048000;
});

// 像素数量
test('BE: 1920x1080 像素总数', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2073600, 0);
  return buf.readUInt32BE(0) === 2073600;
});

test('LE: 1920x1080 像素总数', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2073600, 0);
  return buf.readUInt32LE(0) === 2073600;
});

test('BE: 4K 像素总数 (3840x2160)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(8294400, 0);
  return buf.readUInt32BE(0) === 8294400;
});

test('LE: 4K 像素总数 (3840x2160)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(8294400, 0);
  return buf.readUInt32LE(0) === 8294400;
});

// 数据库记录ID
test('BE: 数据库自增ID', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(999999, 0);
  return buf.readUInt32BE(0) === 999999;
});

test('LE: 数据库自增ID', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(999999, 0);
  return buf.readUInt32LE(0) === 999999;
});

// 哈希值
test('BE: 简单哈希值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0xABCDEF12, 0);
  return buf.readUInt32BE(0) === 0xABCDEF12;
});

test('LE: 简单哈希值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0xABCDEF12, 0);
  return buf.readUInt32LE(0) === 0xABCDEF12;
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
