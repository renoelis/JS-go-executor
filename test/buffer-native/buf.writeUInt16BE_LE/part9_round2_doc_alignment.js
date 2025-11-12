// buf.writeUInt16BE/LE() - Round 2: 官方文档补充测试
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

// 官方文档示例验证
test('writeUInt16BE: 官方文档示例 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt16BE(0xdead, 0);
  buf.writeUInt16BE(0xbeef, 2);
  return buf.toString('hex') === 'deadbeef';
});

test('writeUInt16LE: 官方文档示例 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt16LE(0xdead, 0);
  buf.writeUInt16LE(0xbeef, 2);
  return buf.toString('hex') === 'addeefbe';
});

// noAssert 参数已废弃，不应该支持
test('writeUInt16BE: 不支持第三参数 noAssert', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUInt16BE(0x1234, 0, true);
  return result === 2;
});

test('writeUInt16LE: 不支持第三参数 noAssert', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUInt16LE(0x1234, 0, true);
  return result === 2;
});

// 方法链式调用模拟
test('writeUInt16BE: 使用返回值进行链式写入', () => {
  const buf = Buffer.alloc(10);
  let offset = 0;
  offset = buf.writeUInt16BE(0x0001, offset);
  offset = buf.writeUInt16BE(0x0203, offset);
  offset = buf.writeUInt16BE(0x0405, offset);
  return offset === 6 && buf[0] === 0x00 && buf[4] === 0x04;
});

test('writeUInt16LE: 使用返回值进行链式写入', () => {
  const buf = Buffer.alloc(10);
  let offset = 0;
  offset = buf.writeUInt16LE(0x0100, offset);
  offset = buf.writeUInt16LE(0x0302, offset);
  offset = buf.writeUInt16LE(0x0504, offset);
  return offset === 6 && buf[0] === 0x00 && buf[4] === 0x04;
});

// 边界值精确验证
test('writeUInt16BE: 值 32767', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(32767, 0);
  return buf[0] === 0x7F && buf[1] === 0xFF;
});

test('writeUInt16LE: 值 32767', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(32767, 0);
  return buf[0] === 0xFF && buf[1] === 0x7F;
});

test('writeUInt16BE: 值 32769', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(32769, 0);
  return buf[0] === 0x80 && buf[1] === 0x01;
});

test('writeUInt16LE: 值 32769', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(32769, 0);
  return buf[0] === 0x01 && buf[1] === 0x80;
});

// 与 readUInt16 的对称性
test('writeUInt16BE: write-read 对称性 1000 个随机值', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 1000; i++) {
    const val = Math.floor(Math.random() * 65536);
    buf.writeUInt16BE(val, 0);
    if (buf.readUInt16BE(0) !== val) return false;
  }
  return true;
});

test('writeUInt16LE: write-read 对称性 1000 个随机值', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 1000; i++) {
    const val = Math.floor(Math.random() * 65536);
    buf.writeUInt16LE(val, 0);
    if (buf.readUInt16LE(0) !== val) return false;
  }
  return true;
});

// 跨 Buffer 类型一致性
test('writeUInt16BE: Buffer.alloc 和 Buffer.allocUnsafe 结果一致', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeUInt16BE(0x1234, 0);
  buf2.writeUInt16BE(0x1234, 0);
  return buf1[0] === buf2[0] && buf1[1] === buf2[1];
});

test('writeUInt16LE: Buffer.alloc 和 Buffer.allocUnsafe 结果一致', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeUInt16LE(0x1234, 0);
  buf2.writeUInt16LE(0x1234, 0);
  return buf1[0] === buf2[0] && buf1[1] === buf2[1];
});

// offset 默认值
test('writeUInt16BE: offset 省略时默认为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: offset 省略时默认为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

// 二进制数据序列化场景
test('writeUInt16BE: 模拟网络协议头', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16BE(0x8000, 0);
  buf.writeUInt16BE(0x0001, 2);
  buf.writeUInt16BE(0x0000, 4);
  buf.writeUInt16BE(0x0020, 6);
  return buf.length === 8 && buf[0] === 0x80;
});

test('writeUInt16LE: 模拟网络协议头', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16LE(0x8000, 0);
  buf.writeUInt16LE(0x0001, 2);
  buf.writeUInt16LE(0x0000, 4);
  buf.writeUInt16LE(0x0020, 6);
  return buf.length === 8 && buf[0] === 0x00;
});

// 十六进制表示验证
test('writeUInt16BE: 0xABCD 字节序正确', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xABCD, 0);
  return buf.toString('hex') === 'abcd';
});

test('writeUInt16LE: 0xABCD 字节序正确', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xABCD, 0);
  return buf.toString('hex') === 'cdab';
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
