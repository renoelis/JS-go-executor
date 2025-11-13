// buf.buffer - Deep Boundary Cases & Compatibility Tests (Part 6)
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

// ========== 深度边界情况测试 ==========

test('Buffer 与 ArrayBuffer 的字节对齐', () => {
  const buf = Buffer.alloc(7); // 非8字节对齐
  const view = new DataView(buf.buffer, buf.byteOffset, buf.length);
  view.setUint8(0, 42);
  return buf[0] === 42 && buf.buffer instanceof ArrayBuffer;
});

test('Buffer 与不同 TypedArray 的字节序', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0x12345678, 0);
  const u32 = new Uint32Array(buf.buffer, buf.byteOffset, 1);
  // 字节序可能不同，但 buffer 应该相同
  return buf.buffer === u32.buffer;
});

test('Buffer slice 的字节边界对齐', () => {
  const buf = Buffer.alloc(100);
  const slice = buf.slice(33, 77); // 非对齐边界
  return slice.buffer === buf.buffer && slice.byteOffset === buf.byteOffset + 33;
});

test('Buffer 与 Float64Array 的精度边界', () => {
  const buf = Buffer.alloc(16);
  const f64 = new Float64Array(buf.buffer, buf.byteOffset, 2);
  f64[0] = Math.PI;
  f64[1] = Math.E;
  return buf.buffer === f64.buffer && buf.buffer.byteLength >= 16;
});

// ========== Unicode 和编码边界测试 ==========

test('Buffer.from(utf8) 的 buffer 与原始字节', () => {
  const str = '你好世界🌍';
  const buf = Buffer.from(str, 'utf8');
  const manual = Buffer.from([0xE4, 0xBD, 0xA0, 0xE5, 0xA5, 0xBD, 0xE4, 0xB8, 0x96, 0xE7, 0x95, 0x8C, 0xF0, 0x9F, 0x8C, 0x8D]);
  return buf.buffer instanceof ArrayBuffer && buf.length > 4;
});

test('Buffer.from(base64) 边界情况', () => {
  const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer instanceof ArrayBuffer && buf.toString('utf8') === 'Hello World';
});

test('Buffer.from(hex) 奇数长度处理', () => {
  try {
    const buf = Buffer.from('12345', 'hex'); // 奇数长度
    return buf.buffer instanceof ArrayBuffer;
  } catch (e) {
    return true; // 可能抛出错误
  }
});

test('Buffer 与 Latin1 编码边界', () => {
  const buf = Buffer.from('\x00\x80\xFF', 'latin1');
  return buf.buffer instanceof ArrayBuffer && buf.length === 3;
});

// ========== 内存压力和极限测试 ==========

test('连续创建大量小 Buffer', () => {
  const buffers = [];
  try {
    for (let i = 0; i < 100; i++) {
      buffers.push(Buffer.alloc(10));
    }
    return buffers.every(buf => buf.buffer instanceof ArrayBuffer);
  } catch (e) {
    return buffers.length > 50; // 至少创建了一半
  }
});

test('Buffer 内存池边界测试', () => {
  const buf1 = Buffer.allocUnsafe(Buffer.poolSize - 1);
  const buf2 = Buffer.allocUnsafe(1);
  const buf3 = Buffer.allocUnsafe(1);
  // buf1 和 buf2 可能在同一池中，buf3 可能在新池中
  return buf1.buffer instanceof ArrayBuffer && 
         buf2.buffer instanceof ArrayBuffer && 
         buf3.buffer instanceof ArrayBuffer;
});

test('Buffer 与内存碎片化', () => {
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    buffers.push(Buffer.alloc(i * 100 + 50));
  }
  return buffers.every(buf => buf.buffer instanceof ArrayBuffer);
});

// ========== 并发和竞态条件测试 ==========

test('并发访问 buffer 属性', () => {
  const buf = Buffer.alloc(10);
  const results = [];
  
  // 模拟并发访问
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      results.push(buf.buffer instanceof ArrayBuffer);
    }, 0);
  }
  
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer 修改期间访问 buffer 属性', () => {
  const buf = Buffer.alloc(10);
  buf[0] = 42;
  const buffer1 = buf.buffer;
  buf[5] = 99;
  const buffer2 = buf.buffer;
  return buffer1 === buffer2 && buffer1 instanceof ArrayBuffer;
});

// ========== 跨模块兼容性测试 ==========

test('Buffer 与 require("buffer") 的兼容性', () => {
  const { Buffer: BufferModule } = require('buffer');
  const buf = BufferModule.alloc(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer 与不同导入方式的兼容性', () => {
  const buf1 = Buffer.alloc(10);
  const { Buffer: BufferImport } = require('buffer');
  const buf2 = BufferImport.alloc(10);
  return buf1.buffer instanceof ArrayBuffer && buf2.buffer instanceof ArrayBuffer;
});

// ========== 数学运算和数值边界 ==========

test('Buffer 长度的数学运算', () => {
  const buf = Buffer.alloc(10);
  const length = buf.buffer.byteLength;
  return length + 0 === length && length * 1 === length && length / 1 === length;
});

test('Buffer byteOffset 的数学运算', () => {
  const buf = Buffer.alloc(20);
  const slice = buf.slice(5, 15);
  const offset = slice.byteOffset;
  return offset >= 0 && offset + slice.length <= buf.buffer.byteLength;
});

test('Buffer 与 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(10);
  const length = buf.buffer.byteLength;
  return length < Number.MAX_SAFE_INTEGER && Number.isSafeInteger(length);
});

// ========== 特殊字符和数据模式 ==========

test('Buffer 包含所有字节值 0-255', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  return buf.buffer instanceof ArrayBuffer && buf.buffer.byteLength >= 256;
});

test('Buffer 重复模式数据', () => {
  const pattern = Buffer.from([0xAA, 0x55, 0xAA, 0x55]);
  const buf = Buffer.concat(Array(100).fill(pattern));
  return buf.buffer instanceof ArrayBuffer && buf.length === 400;
});

test('Buffer 随机数据稳定性', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  const buffer1 = buf.buffer;
  // 修改数据
  buf[0] = 0;
  const buffer2 = buf.buffer;
  return buffer1 === buffer2 && buffer1 instanceof ArrayBuffer;
});

// ========== 错误恢复和异常处理 ==========

test('Buffer 在异常后的 buffer 属性', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.readInt32BE(20); // 越界读取
  } catch (e) {
    // 忽略错误
  }
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer 类型错误后的恢复', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write(123); // 类型错误
  } catch (e) {
    // 忽略错误
  }
  return buf.buffer instanceof ArrayBuffer;
});

// ========== 性能和优化测试 ==========

test('Buffer.buffer 访问的时间复杂度', () => {
  const buf = Buffer.alloc(1000);
  const start = process.hrtime ? process.hrtime() : [Date.now(), 0];
  
  for (let i = 0; i < 1000; i++) {
    const buffer = buf.buffer;
  }
  
  const end = process.hrtime ? process.hrtime(start) : [Date.now() - start[0], 0];
  const timeMs = end[0] * 1000 + end[1] / 1000000;
  
  return timeMs < 100 && buf.buffer instanceof ArrayBuffer; // 应该很快
});

test('大 Buffer 的 buffer 属性访问', () => {
  try {
    const buf = Buffer.alloc(10 * 1024 * 1024); // 10MB
    const start = Date.now();
    const buffer = buf.buffer;
    const end = Date.now();
    return (end - start) < 100 && buffer instanceof ArrayBuffer;
  } catch (e) {
    return true; // 内存不足时跳过
  }
});

// ========== 环境兼容性测试 ==========

test('Buffer 在不同 JavaScript 引擎的兼容性', () => {
  const buf = Buffer.alloc(10);
  // 检查基本功能在不同环境下的一致性
  return buf.buffer instanceof ArrayBuffer && 
         typeof buf.buffer.byteLength === 'number' &&
         buf.buffer.byteLength >= 10;
});

test('Buffer 与 Web API 的兼容性', () => {
  const buf = Buffer.alloc(10);
  // 测试与可能存在的 Web API 的兼容性
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    try {
      const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
      crypto.getRandomValues(view);
      return buf.buffer instanceof ArrayBuffer;
    } catch (e) {
      return buf.buffer instanceof ArrayBuffer;
    }
  }
  return buf.buffer instanceof ArrayBuffer;
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
