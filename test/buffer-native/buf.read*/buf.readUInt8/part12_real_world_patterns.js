// buf.readUInt8() - 真实世界模式测试
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

// HTTP 状态码读取
test('读取 HTTP 状态码字节表示', () => {
  const buf = Buffer.from('200 OK', 'ascii');
  // '2' = 50, '0' = 48, '0' = 48
  return buf.readUInt8(0) === 50 && 
         buf.readUInt8(1) === 48 && 
         buf.readUInt8(2) === 48;
});

// JSON 特殊字符
test('读取 JSON 特殊字符字节', () => {
  const buf = Buffer.from('{}[]":"', 'ascii');
  // '{' = 123, '}' = 125, '[' = 91, ']' = 93, '"' = 34, ':' = 58
  return buf.readUInt8(0) === 123 && 
         buf.readUInt8(1) === 125 && 
         buf.readUInt8(2) === 91 &&
         buf.readUInt8(3) === 93;
});

// XML 标签字节
test('读取 XML 标签字节', () => {
  const buf = Buffer.from('<>', 'ascii');
  // '<' = 60, '>' = 62
  return buf.readUInt8(0) === 60 && buf.readUInt8(1) === 62;
});

// 控制字符
test('读取制表符（Tab）', () => {
  const buf = Buffer.from('\t', 'ascii');
  return buf.readUInt8(0) === 9;
});

test('读取换行符（LF）', () => {
  const buf = Buffer.from('\n', 'ascii');
  return buf.readUInt8(0) === 10;
});

test('读取回车符（CR）', () => {
  const buf = Buffer.from('\r', 'ascii');
  return buf.readUInt8(0) === 13;
});

test('读取空格', () => {
  const buf = Buffer.from(' ', 'ascii');
  return buf.readUInt8(0) === 32;
});

test('读取空字符（NULL）', () => {
  const buf = Buffer.from('\x00', 'ascii');
  return buf.readUInt8(0) === 0;
});

test('读取响铃符（BEL）', () => {
  const buf = Buffer.from('\x07', 'ascii');
  return buf.readUInt8(0) === 7;
});

test('读取退格符（BS）', () => {
  const buf = Buffer.from('\x08', 'ascii');
  return buf.readUInt8(0) === 8;
});

test('读取转义符（ESC）', () => {
  const buf = Buffer.from('\x1B', 'ascii');
  return buf.readUInt8(0) === 27;
});

// MIME 类型标识
test('读取 MIME 类型前缀字节', () => {
  const buf = Buffer.from('text/html', 'ascii');
  // 't' = 116
  return buf.readUInt8(0) === 116;
});

// 百分号编码
test('读取 URL 编码的百分号', () => {
  const buf = Buffer.from('%20', 'ascii');
  // '%' = 37, '2' = 50, '0' = 48
  return buf.readUInt8(0) === 37 && 
         buf.readUInt8(1) === 50 && 
         buf.readUInt8(2) === 48;
});

// Base64 字符集
test('读取 Base64 字符', () => {
  const buf = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', 'ascii');
  // 'A' = 65, 'Z' = 90, 'a' = 97, 'z' = 122, '0' = 48, '9' = 57, '+' = 43, '/' = 47
  return buf.readUInt8(0) === 65 && 
         buf.readUInt8(25) === 90 && 
         buf.readUInt8(26) === 97 && 
         buf.readUInt8(51) === 122 &&
         buf.readUInt8(62) === 43 &&
         buf.readUInt8(63) === 47;
});

// BOM (Byte Order Mark)
test('读取 UTF-8 BOM', () => {
  const buf = Buffer.from([0xEF, 0xBB, 0xBF]);
  return buf.readUInt8(0) === 0xEF && 
         buf.readUInt8(1) === 0xBB && 
         buf.readUInt8(2) === 0xBF;
});

// 文件扩展名标识
test('读取常见文件扩展名字节', () => {
  const buf = Buffer.from('.txt', 'ascii');
  // '.' = 46, 't' = 116, 'x' = 120
  return buf.readUInt8(0) === 46 && 
         buf.readUInt8(1) === 116 && 
         buf.readUInt8(2) === 120;
});

// 数据帧头部
test('读取模拟数据帧起始标志', () => {
  const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG SOI
  return buf.readUInt8(0) === 0xFF && 
         buf.readUInt8(1) === 0xD8;
});

test('读取模拟 GIF 文件头', () => {
  const buf = Buffer.from('GIF89a', 'ascii');
  // 'G' = 71, 'I' = 73, 'F' = 70
  return buf.readUInt8(0) === 71 && 
         buf.readUInt8(1) === 73 && 
         buf.readUInt8(2) === 70;
});

test('读取模拟 PDF 文件头', () => {
  const buf = Buffer.from('%PDF', 'ascii');
  // '%' = 37, 'P' = 80, 'D' = 68, 'F' = 70
  return buf.readUInt8(0) === 37 && 
         buf.readUInt8(1) === 80 && 
         buf.readUInt8(2) === 68 && 
         buf.readUInt8(3) === 70;
});

// 时间戳分解
test('读取 Unix 时间戳的各个字节', () => {
  const timestamp = 1699545600; // 2023-11-09 20:00:00
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(timestamp, 0);
  // 验证能读取各个字节
  return typeof buf.readUInt8(0) === 'number' &&
         typeof buf.readUInt8(1) === 'number' &&
         typeof buf.readUInt8(2) === 'number' &&
         typeof buf.readUInt8(3) === 'number';
});

// 端口号字节
test('读取网络端口号的高低字节', () => {
  const port = 8080; // 0x1F90
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(port, 0);
  const high = buf.readUInt8(0);
  const low = buf.readUInt8(1);
  return (high << 8) + low === port;
});

// UUID 字节
test('读取 UUID 的部分字节', () => {
  const uuid = Buffer.from('550e8400e29b41d4a716446655440000', 'hex');
  return uuid.readUInt8(0) === 0x55 && 
         uuid.readUInt8(1) === 0x0e;
});

// 位图像素数据
test('读取 RGB565 格式的字节', () => {
  const buf = Buffer.from([0x1F, 0x00]); // 纯红色
  return buf.readUInt8(0) === 0x1F && buf.readUInt8(1) === 0x00;
});

// 音频采样
test('读取 8 位音频采样数据', () => {
  const buf = Buffer.from([128, 200, 100, 0, 255]);
  // 验证中心值（128 = 静音）
  return buf.readUInt8(0) === 128;
});

// 传感器数据
test('读取模拟温度传感器数据（0-255 映射）', () => {
  const buf = Buffer.from([20, 25, 30, 22, 28]);
  const temp1 = buf.readUInt8(0);
  const temp2 = buf.readUInt8(4);
  return temp1 === 20 && temp2 === 28;
});

// 游戏存档数据
test('读取游戏存档标志字节', () => {
  const buf = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]); // 常见的魔数
  return buf.readUInt8(0) === 0xDE && 
         buf.readUInt8(1) === 0xAD && 
         buf.readUInt8(2) === 0xBE && 
         buf.readUInt8(3) === 0xEF;
});

// 加密盐值
test('读取加密盐值的各个字节', () => {
  const salt = Buffer.from([0x4A, 0x5F, 0x2E, 0x91, 0xC3, 0x7D, 0xB8, 0x6E]);
  for (let i = 0; i < salt.length; i++) {
    const expected = [0x4A, 0x5F, 0x2E, 0x91, 0xC3, 0x7D, 0xB8, 0x6E];
    if (salt.readUInt8(i) !== expected[i]) return false;
  }
  return true;
});

// 数据库记录标识
test('读取数据库记录类型标识', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]); // 假设 1=insert, 2=update, 3=delete
  return buf.readUInt8(0) === 1 && 
         buf.readUInt8(1) === 2 && 
         buf.readUInt8(2) === 3;
});

// 协议版本号
test('读取协议版本号', () => {
  const buf = Buffer.from([0x01, 0x01]); // v1.1
  return buf.readUInt8(0) === 1 && buf.readUInt8(1) === 1;
});

// 消息类型标识
test('读取消息类型枚举', () => {
  const MSG_TYPE = {
    CONNECT: 1,
    DISCONNECT: 2,
    DATA: 3,
    ACK: 4
  };
  const buf = Buffer.from([MSG_TYPE.DATA, MSG_TYPE.ACK]);
  return buf.readUInt8(0) === 3 && buf.readUInt8(1) === 4;
});

// 压缩级别
test('读取压缩级别标志（0-9）', () => {
  const buf = Buffer.from([9, 6, 0]); // 最大、默认、无压缩
  return buf.readUInt8(0) === 9 && 
         buf.readUInt8(1) === 6 && 
         buf.readUInt8(2) === 0;
});

// 优先级队列
test('读取优先级值', () => {
  const buf = Buffer.from([255, 128, 64, 0]); // 最高到最低
  return buf.readUInt8(0) === 255 && 
         buf.readUInt8(1) === 128 && 
         buf.readUInt8(2) === 64 && 
         buf.readUInt8(3) === 0;
});

// 百分比值
test('读取百分比（0-100）', () => {
  const buf = Buffer.from([0, 25, 50, 75, 100]);
  return buf.readUInt8(0) === 0 && 
         buf.readUInt8(2) === 50 && 
         buf.readUInt8(4) === 100;
});

// 透明度值
test('读取 alpha 通道值', () => {
  const buf = Buffer.from([0, 64, 128, 192, 255]); // 完全透明到完全不透明
  return buf.readUInt8(0) === 0 && 
         buf.readUInt8(4) === 255;
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
