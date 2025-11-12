// Buffer.isBuffer() - 兼容性与历史行为测试
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

// Node.js Buffer 模块基础测试
test('require buffer 模块的 Buffer', () => {
  const { Buffer: BufferFromModule } = require('buffer');
  const buf = new BufferFromModule(5);
  return Buffer.isBuffer(buf) === true;
});

test('global Buffer 和 require buffer 一致性', () => {
  const { Buffer: ModuleBuffer } = require('buffer');
  const globalBuf = Buffer.from('hello');
  const moduleBuf = ModuleBuffer.from('hello');
  return Buffer.isBuffer(globalBuf) === true &&
         Buffer.isBuffer(moduleBuf) === true &&
         ModuleBuffer.isBuffer(globalBuf) === true &&
         ModuleBuffer.isBuffer(moduleBuf) === true;
});

// Buffer 构造方式兼容性
test('new Buffer 废弃语法检查 - allocUnsafe', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return false;
  }
});

test('Buffer 静态方法创建一致性', () => {
  const methods = [
    Buffer.alloc(5),
    Buffer.allocUnsafe(5),
    Buffer.allocUnsafeSlow(5),
    Buffer.from('test'),
    Buffer.from([1, 2, 3]),
    Buffer.from(new ArrayBuffer(5))
  ];
  return methods.every(buf => Buffer.isBuffer(buf) === true);
});

// 跨上下文测试（vm 模块场景模拟）
test('Buffer 跨作用域一致性', () => {
  function createBuffer() {
    return Buffer.from('test');
  }
  const buf = createBuffer();
  return Buffer.isBuffer(buf) === true;
});

test('闭包中的 Buffer', () => {
  const createBuf = (() => {
    const buf = Buffer.from('closure');
    return () => buf;
  })();
  return Buffer.isBuffer(createBuf()) === true;
});

// 异步场景测试
test('Promise 包装的 Buffer 验证', () => {
  const promise = Promise.resolve(Buffer.from('async'));
  return Buffer.isBuffer(promise) === false;
});

test('async 函数返回的 Buffer', () => {
  async function getBuf() {
    return Buffer.from('async');
  }
  const result = getBuf();
  return Buffer.isBuffer(result) === false;
});

// 历史 API 行为保持
test('Buffer.concat 历史行为 - 保留 Buffer 类型', () => {
  const bufs = [
    Buffer.from('hello'),
    Buffer.from(' '),
    Buffer.from('world')
  ];
  const result = Buffer.concat(bufs);
  return Buffer.isBuffer(result) === true;
});

test('Buffer.concat 指定长度后仍是 Buffer', () => {
  const bufs = [Buffer.from('hello'), Buffer.from('world')];
  const result = Buffer.concat(bufs, 8);
  return Buffer.isBuffer(result) === true;
});

test('Buffer.concat 超长指定仍是 Buffer', () => {
  const bufs = [Buffer.from('hi')];
  const result = Buffer.concat(bufs, 100);
  return Buffer.isBuffer(result) === true;
});

// 编码兼容性测试
test('所有支持的编码创建的都是 Buffer', () => {
  const encodings = ['utf8', 'utf-8', 'hex', 'base64', 'base64url',
                     'ascii', 'latin1', 'binary', 'ucs2', 'ucs-2',
                     'utf16le', 'utf-16le'];
  const testStr = 'hello';

  for (const enc of encodings) {
    try {
      const buf = Buffer.from(testStr, enc);
      if (!Buffer.isBuffer(buf)) {
        return false;
      }
    } catch (e) {
      // 某些编码可能不支持，跳过
    }
  }
  return true;
});

// Buffer 方法返回值类型测试
test('Buffer.slice 返回类型保持 Buffer', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(0, 5);
  return Buffer.isBuffer(slice) === true;
});

test('Buffer.subarray 返回类型保持 Buffer', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(0, 5);
  return Buffer.isBuffer(sub) === true;
});

test('Buffer 实例方法不改变类型', () => {
  const buf = Buffer.from('hello');
  buf.write('world', 0);
  buf.fill(0);
  buf.reverse();
  return Buffer.isBuffer(buf) === true;
});

// TypedArray 互操作兼容性
test('Buffer 继承 Uint8Array 但判断有区别', () => {
  const buf = Buffer.from('test');
  const u8 = new Uint8Array([1, 2, 3, 4]);
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(u8) === false;
});

test('从 Buffer 创建 TypedArray 视图不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const u16 = new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  return Buffer.isBuffer(u16) === false && Buffer.isBuffer(buf) === true;
});

// 内存管理相关
test('allocUnsafe 和 alloc 结果都是 Buffer', () => {
  const unsafe = Buffer.allocUnsafe(10);
  const safe = Buffer.alloc(10);
  return Buffer.isBuffer(unsafe) === true && Buffer.isBuffer(safe) === true;
});

test('allocUnsafeSlow 池外分配仍是 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf) === true;
});

// JSON 序列化兼容性
test('Buffer JSON 序列化后不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const json = JSON.parse(JSON.stringify(buf));
  return Buffer.isBuffer(json) === false;
});

test('从 JSON 恢复的数据不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const json = buf.toJSON();
  return Buffer.isBuffer(json) === false && json.type === 'Buffer';
});

// Buffer 字符串化
test('Buffer toString 结果不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString();
  return Buffer.isBuffer(str) === false && typeof str === 'string';
});

test('Buffer toString 各种编码结果都不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const encodings = ['utf8', 'hex', 'base64', 'ascii'];
  return encodings.every(enc => {
    const str = buf.toString(enc);
    return Buffer.isBuffer(str) === false;
  });
});

// 比较操作兼容性
test('Buffer.compare 不改变参数类型', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('def');
  Buffer.compare(buf1, buf2);
  return Buffer.isBuffer(buf1) === true && Buffer.isBuffer(buf2) === true;
});

test('Buffer equals 方法兼容性', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  buf1.equals(buf2);
  return Buffer.isBuffer(buf1) === true && Buffer.isBuffer(buf2) === true;
});

// 特殊边界兼容性
test('Buffer.from 空输入创建零长度 Buffer', () => {
  const tests = [
    Buffer.from(''),
    Buffer.from([]),
    Buffer.from(new ArrayBuffer(0))
  ];
  return tests.every(buf => Buffer.isBuffer(buf) === true && buf.length === 0);
});

// 版本特性验证
test('Node v25.0.0 Buffer.isBuffer 基本行为', () => {
  const buf = Buffer.alloc(10);
  const notBuf = new Uint8Array(10);
  return Buffer.isBuffer(buf) === true && Buffer.isBuffer(notBuf) === false;
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
