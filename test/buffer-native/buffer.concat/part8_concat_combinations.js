// Buffer.concat() - Complex Combinations and Missing Scenarios
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

// 组合场景：多种编码混合
test('连接不同编码创建的Buffer', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('776f726c64', 'hex'); // 'world'
  const buf3 = Buffer.from('IQ==', 'base64'); // '!'
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.toString('utf8') === 'helloworld!';
});

test('连接utf8和latin1编码Buffer', () => {
  const buf1 = Buffer.from('café', 'utf8');
  const buf2 = Buffer.from('test', 'latin1');
  const result = Buffer.concat([buf1, buf2]);
  const expected = Buffer.concat([Buffer.from('café', 'utf8'), Buffer.from('test', 'latin1')]);
  return result.length === expected.length;
});

// 组合场景：Buffer和Uint8Array交替
test('交替连接Buffer和Uint8Array', () => {
  const buf1 = Buffer.from([1]);
  const arr1 = new Uint8Array([2]);
  const buf2 = Buffer.from([3]);
  const arr2 = new Uint8Array([4]);
  const result = Buffer.concat([buf1, arr1, buf2, arr2]);
  return result.length === 4 &&
         result[0] === 1 && result[1] === 2 &&
         result[2] === 3 && result[3] === 4;
});

// 组合场景：totalLength与各种输入组合
test('totalLength + 混合类型输入', () => {
  const buf = Buffer.from('ab');
  const arr = new Uint8Array([99, 100]); // 'cd'
  const result = Buffer.concat([buf, arr], 3);
  return result.length === 3 &&
         result.toString('utf8') === 'abc';
});

test('totalLength + 大量空Buffer', () => {
  const buffers = [
    Buffer.alloc(0),
    Buffer.from('test'),
    Buffer.alloc(0),
    Buffer.alloc(0),
    Buffer.from('data'),
    Buffer.alloc(0)
  ];
  const result = Buffer.concat(buffers, 5);
  return result.length === 5 && result.toString() === 'testd';
});

// 精确的数值边界测试
test('连接后长度等于JavaScript MAX_SAFE_INTEGER以下', () => {
  // 测试较大但安全的长度
  const size = 10 * 1024 * 1024; // 10MB
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xBB);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === size * 2 &&
         result[0] === 0xAA &&
         result[size] === 0xBB;
});

test('totalLength为MAX_SAFE_INTEGER报错', () => {
  const buf = Buffer.from('test');
  try {
    const result = Buffer.concat([buf], Number.MAX_SAFE_INTEGER);
    return false; // 应该抛出错误或内存不足
  } catch (e) {
    return true; // 预期会失败
  }
});

// Buffer方法链式调用相关
test('concat后的Buffer可以继续slice', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2]);
  const sliced = result.slice(5, 10);
  return sliced.toString() === 'world';
});

test('concat后的Buffer可以继续toString各种编码', () => {
  const buf1 = Buffer.from([0xDE, 0xAD]);
  const buf2 = Buffer.from([0xBE, 0xEF]);
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('hex') === 'deadbeef' &&
         result.toString('base64') === '3q2+7w==';
});

test('concat后的Buffer可以写入数据', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 20);
  result.write('END', 10);
  return result.toString('utf8', 10, 13) === 'END';
});

test('concat后的Buffer可以读取数值', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt32BE(100, 0);
  buf2.writeInt32BE(200, 0);
  const result = Buffer.concat([buf1, buf2]);
  return result.readInt32BE(0) === 100 &&
         result.readInt32BE(4) === 200;
});

// 特殊构造的Buffer
test('连接通过Buffer.alloc创建的Buffer', () => {
  const buf1 = Buffer.alloc(5, 'a');
  const buf2 = Buffer.alloc(5, 'b');
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 10 &&
         result.toString() === 'aaaaabbbbb';
});

test('连接通过Buffer.allocUnsafe创建的Buffer（写入后）', () => {
  const buf1 = Buffer.allocUnsafe(3);
  const buf2 = Buffer.allocUnsafe(3);
  buf1.write('abc');
  buf2.write('def');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString() === 'abcdef';
});

test('连接通过Buffer.from(arrayBuffer)创建的Buffer', () => {
  const ab1 = new ArrayBuffer(4);
  const ab2 = new ArrayBuffer(4);
  new Uint8Array(ab1).set([1, 2, 3, 4]);
  new Uint8Array(ab2).set([5, 6, 7, 8]);
  const buf1 = Buffer.from(ab1);
  const buf2 = Buffer.from(ab2);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 8 &&
         result[0] === 1 && result[7] === 8;
});

// 二进制协议模拟场景
test('模拟二进制协议：头部+数据+尾部', () => {
  const header = Buffer.from([0xFF, 0xFE, 0x00, 0x01]); // 协议头
  const data = Buffer.from('payload data', 'utf8');
  const footer = Buffer.from([0x00, 0x00]); // 协议尾
  const packet = Buffer.concat([header, data, footer]);
  return packet.length === 18 &&
         packet[0] === 0xFF && packet[1] === 0xFE &&
         packet[packet.length - 2] === 0 && packet[packet.length - 1] === 0;
});

test('模拟数据块拼接', () => {
  const chunks = [
    Buffer.from('chunk1'),
    Buffer.from('chunk2'),
    Buffer.from('chunk3')
  ];
  const result = Buffer.concat(chunks);
  return result.toString() === 'chunk1chunk2chunk3';
});

// 性能相关边界
test('连接10000个单字节Buffer', () => {
  const buffers = [];
  for (let i = 0; i < 10000; i++) {
    buffers.push(Buffer.from([i % 256]));
  }
  const result = Buffer.concat(buffers);
  return result.length === 10000 &&
         result[0] === 0 &&
         result[5000] === (5000 % 256);
});

test('连接后totalLength非常小（极端截断）', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from('data'));
  }
  const result = Buffer.concat(buffers, 1);
  return result.length === 1 && result[0] === 100; // 'd'
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
