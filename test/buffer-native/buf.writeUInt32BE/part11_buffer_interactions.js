// buf.writeUInt32BE() - Buffer Method Interactions Tests
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

// 与其他写入方法的交互
test('与 writeUInt32LE 交互', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32LE(0x9ABCDEF0, 4);

  return buf.readUInt32BE(0) === 0x12345678 &&
         buf.readUInt32LE(4) === 0x9ABCDEF0;
});

test('与 writeUInt16BE 交互', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt16BE(0xABCD, 4);

  return buf.readUInt32BE(0) === 0x12345678 &&
         buf.readUInt16BE(4) === 0xABCD;
});

test('与 writeUInt8 交互', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt8(0xFF, 4);

  return buf.readUInt32BE(0) === 0x12345678 &&
         buf.readUInt8(4) === 0xFF;
});

test('与 writeInt32BE 交互', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeInt32BE(-1, 4);

  return buf.readUInt32BE(0) === 0x12345678 &&
         buf.readInt32BE(4) === -1;
});

// 与读取方法的交互
test('写入后立即读取', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x12345678, 0);
  const value = buf.readUInt32BE(0);

  return value === 0x12345678;
});

test('写入后用不同字节序读取', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x12345678, 0);
  const value = buf.readUInt32LE(0);

  // 大端写入，小端读取应该得到字节序颠倒的结果
  return value === 0x78563412;
});

// 与 Buffer 操作方法的交互
test('写入后 fill 操作', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.fill(0xFF, 4, 8);

  return buf.readUInt32BE(0) === 0x12345678 &&
         buf.readUInt8(4) === 0xFF &&
         buf.readUInt8(7) === 0xFF;
});

test('写入后 copy 操作', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  
  buf1.writeUInt32BE(0x12345678, 0);
  buf1.copy(buf2);

  return buf2.readUInt32BE(0) === 0x12345678;
});

test('写入后 slice 操作', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32BE(0x9ABCDEF0, 4);
  
  const slice = buf.slice(0, 4);
  return slice.readUInt32BE(0) === 0x12345678;
});

// 与 Buffer 创建方法的交互
test('Buffer.from 后写入', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  buf.writeUInt32BE(0x12345678, 0);

  return buf.readUInt32BE(0) === 0x12345678;
});

test('Buffer.alloc 后写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0x12345678, 0);

  return buf.readUInt32BE(0) === 0x12345678;
});

test('Buffer.allocUnsafe 后写入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x12345678, 0);

  return buf.readUInt32BE(0) === 0x12345678;
});

// 与 Buffer 比较方法的交互
test('写入后 equals 比较', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  
  buf1.writeUInt32BE(0x12345678, 0);
  buf2.writeUInt32BE(0x12345678, 0);

  return buf1.equals(buf2);
});

test('写入后 compare 比较', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  
  buf1.writeUInt32BE(0x12345678, 0);
  buf2.writeUInt32BE(0x12345679, 0);

  return buf1.compare(buf2) < 0;
});

// 与 Buffer 搜索方法的交互
test('写入后 indexOf 搜索', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32BE(0x12345678, 4);

  const searchBuf = Buffer.from([0x12, 0x34]);
  return buf.indexOf(searchBuf) === 0;
});

test('写入后 includes 搜索', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);

  const searchBuf = Buffer.from([0x34, 0x56]);
  return buf.includes(searchBuf);
});

// 与 Buffer 转换方法的交互
test('写入后 toString 转换', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x48656C6C, 0); // "Hell" in ASCII

  return buf.toString('ascii') === 'Hell';
});

test('写入后 toJSON 转换', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x12345678, 0);

  const json = buf.toJSON();
  return json.type === 'Buffer' && 
         json.data[0] === 0x12 && 
         json.data[1] === 0x34 && 
         json.data[2] === 0x56 && 
         json.data[3] === 0x78;
});

// 与 Buffer 属性的交互
test('写入后 length 属性', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x12345678, 0);

  return buf.length === 4;
});

test('写入后 byteLength 属性', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x12345678, 0);

  return buf.byteLength === 4;
});

// 链式操作测试
test('连续写入操作', () => {
  const buf = Buffer.allocUnsafe(12);
  
  // 连续写入不同的值
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32BE(0x9ABCDEF0, 4);
  buf.writeUInt32BE(0x11111111, 8);

  return buf.readUInt32BE(0) === 0x12345678 &&
         buf.readUInt32BE(4) === 0x9ABCDEF0 &&
         buf.readUInt32BE(8) === 0x11111111;
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
