// buf.write() - 第9轮：最终深度补漏和综合测试
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

// 综合场景1：复杂的多步骤操作
test('allocate -> fill -> write -> read 完整流程', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xFF);
  buf.write('test', 3);
  return buf[0] === 0xFF && buf[3] === 0x74 && buf[7] === 0xFF;
});

test('from -> write -> copy -> compare 完整流程', () => {
  const buf1 = Buffer.from('hello');
  buf1.write('HELLO');
  const buf2 = Buffer.alloc(5);
  buf1.copy(buf2);
  return Buffer.compare(buf1, buf2) === 0;
});

// 综合场景2：所有编码的空字符串测试
test('utf8 空字符串', () => {
  const buf = Buffer.alloc(10);
  return buf.write('', 'utf8') === 0;
});

test('utf16le 空字符串', () => {
  const buf = Buffer.alloc(10);
  return buf.write('', 'utf16le') === 0;
});

test('latin1 空字符串', () => {
  const buf = Buffer.alloc(10);
  return buf.write('', 'latin1') === 0;
});

test('ascii 空字符串', () => {
  const buf = Buffer.alloc(10);
  return buf.write('', 'ascii') === 0;
});

test('hex 空字符串', () => {
  const buf = Buffer.alloc(10);
  return buf.write('', 'hex') === 0;
});

test('base64 空字符串', () => {
  const buf = Buffer.alloc(10);
  return buf.write('', 'base64') === 0;
});

// 综合场景3：所有编码的单字符测试
test('utf8 单字符 A', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A', 'utf8');
  return len === 1 && buf[0] === 0x41;
});

test('utf16le 单字符 A', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A', 'utf16le');
  return len === 2 && buf[0] === 0x41 && buf[1] === 0x00;
});

test('latin1 单字符 A', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A', 'latin1');
  return len === 1 && buf[0] === 0x41;
});

test('ascii 单字符 A', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A', 'ascii');
  return len === 1 && buf[0] === 0x41;
});

test('hex 单字符对 41', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('41', 'hex');
  return len === 1 && buf[0] === 0x41;
});

test('base64 双字符 QQ', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('QQ', 'base64');
  return len === 1 && buf[0] === 0x41;
});

// 综合场景4：边界值的系统性测试
test('写入到 offset=0, length=1', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 0, 1);
  return len === 1 && buf[0] === 0x68;
});

test('写入到 offset=5, length=5', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 5, 5);
  return len === 5 && buf[5] === 0x68;
});

test('写入到 offset=9, length=1', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('x', 9, 1);
  return len === 1 && buf[9] === 0x78;
});

// 综合场景5：特殊字符组合
test('写入 emoji + ASCII', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('😀A');
  return len === 5;
});

test('写入 中文 + ASCII', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('中A');
  return len === 4;
});

test('写入 emoji + 中文', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('😀中');
  return len === 7;
});

test('写入 ASCII + emoji + 中文', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('A😀中');
  return len === 8;
});

// 综合场景6：返回值的详细验证
test('返回值等于实际写入字节数 - utf8', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello');
  let count = 0;
  for (let i = 0; i < 5; i++) {
    if (buf[i] !== 0) count++;
  }
  return len === count;
});

test('返回值等于实际写入字节数 - hex', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('0102030405', 'hex');
  return len === 5;
});

test('返回值等于实际写入字节数 - base64', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('QUJDREU=', 'base64');
  return len === 5;
});

// 综合场景7：写入后 Buffer 的完整性检查
test('写入后 Buffer.length 不变', () => {
  const buf = Buffer.alloc(10);
  const originalLength = buf.length;
  buf.write('test');
  return buf.length === originalLength;
});

test('写入后 Buffer.byteLength 不变', () => {
  const buf = Buffer.alloc(10);
  const originalByteLength = buf.byteLength;
  buf.write('test');
  return buf.byteLength === originalByteLength;
});

test('写入后 instanceof Buffer 仍为 true', () => {
  const buf = Buffer.alloc(10);
  buf.write('test');
  return buf instanceof Buffer;
});

test('写入后 instanceof Uint8Array 仍为 true', () => {
  const buf = Buffer.alloc(10);
  buf.write('test');
  return buf instanceof Uint8Array;
});

// 综合场景8：与 ArrayBuffer 的深度交互
test('Buffer 基于 ArrayBuffer，写入后 ArrayBuffer 受影响', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  buf.write('test');
  const view = new Uint8Array(ab);
  return view[0] === 0x74;
});

test('多个 Buffer 共享 ArrayBuffer，写入互相影响', () => {
  const ab = new ArrayBuffer(20);
  const buf1 = Buffer.from(ab, 0, 10);
  const buf2 = Buffer.from(ab, 10, 10);
  buf1.write('hello');
  buf2.write('world');
  const view = new Uint8Array(ab);
  return view[0] === 0x68 && view[10] === 0x77;
});

// 综合场景9：极端 offset 和 length 组合
test('offset=0, length=0 任何字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello world', 0, 0);
  return len === 0;
});

test('offset=5, length=0 任何字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello world', 5, 0);
  return len === 0;
});

test('offset=buffer.length, length=0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('test', 10, 0);
  return len === 0;
});

// 综合场景10：写入特殊模式的字符串
test('写入重复字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('aaaaaaaaaa');
  return len === 10 && buf[0] === 0x61 && buf[9] === 0x61;
});

test('写入递增字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('0123456789');
  return len === 10 && buf[0] === 0x30 && buf[9] === 0x39;
});

test('写入交替字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('ababababab');
  return len === 10 && buf[0] === 0x61 && buf[1] === 0x62;
});

// 综合场景11：所有编码别名的完整性测试
test('utf-8 与 utf8 完全等价', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.write('test', 'utf8');
  buf2.write('test', 'utf-8');
  return buf1[0] === buf2[0] && buf1[3] === buf2[3];
});

test('ucs2 与 ucs-2 完全等价', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.write('test', 'ucs2');
  buf2.write('test', 'ucs-2');
  return buf1[0] === buf2[0] && buf1[1] === buf2[1];
});

test('utf16le 与 utf-16le 完全等价', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.write('test', 'utf16le');
  buf2.write('test', 'utf-16le');
  return buf1[0] === buf2[0] && buf1[1] === buf2[1];
});

test('binary 与 latin1 完全等价', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.write('test', 'binary');
  buf2.write('test', 'latin1');
  return buf1[0] === buf2[0] && buf1[3] === buf2[3];
});

// 综合场景12：异常恢复测试
test('写入失败不影响 Buffer 原有内容', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xAA);
  try {
    buf.write('test', 100);
  } catch (e) {
    // 预期会失败
  }
  return buf[0] === 0xAA && buf[9] === 0xAA;
});

test('参数错误不改变 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  try {
    buf.write('world', 1.5);
  } catch (e) {
    // 预期会失败
  }
  return buf.toString('utf8', 0, 5) === 'hello';
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
