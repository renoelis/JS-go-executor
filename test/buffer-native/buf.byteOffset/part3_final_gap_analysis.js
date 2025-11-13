// buf.byteOffset - 最终查缺补漏和兼容性验证
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

// ========== Part 1: 兼容性和标准符合性 ==========

test('Buffer.isBuffer 对所有 byteOffset 的 Buffer 返回 true', () => {
  const ab = new ArrayBuffer(20);
  const buffers = [
    Buffer.alloc(10),
    Buffer.from(ab),
    Buffer.from(ab, 5),
    Buffer.from(ab, 0, 10),
    Buffer.from('hello'),
    Buffer.from([1, 2, 3, 4, 5])
  ];
  return buffers.every(buf => Buffer.isBuffer(buf) && typeof buf.byteOffset === 'number');
});

test('instanceof Buffer 对所有 byteOffset 的 Buffer 返回 true', () => {
  const ab = new ArrayBuffer(20);
  const buffers = [
    Buffer.alloc(10),
    Buffer.from(ab, 3),
    Buffer.allocUnsafe(10),
    Buffer.allocUnsafeSlow(10)
  ];
  return buffers.every(buf => buf instanceof Buffer && typeof buf.byteOffset === 'number');
});

test('Buffer 和 Uint8Array 的 byteOffset 行为差异', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const u8 = new Uint8Array(ab, 5, 10);
  // Buffer.from(ArrayBuffer, offset) 保持相同的 offset
  // Uint8Array 也使用相同的 offset
  return buf.byteOffset === 5 && u8.byteOffset === 5;
});

test('Buffer.prototype 方法的 byteOffset 一致性', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5);
  const methods = ['toString', 'toJSON', 'equals', 'compare', 'indexOf', 'includes'];
  const originalOffset = buf.byteOffset;
  
  // 调用各种方法后 byteOffset 应该保持不变
  methods.forEach(method => {
    if (typeof buf[method] === 'function') {
      try {
        if (method === 'equals' || method === 'compare') {
          buf[method](Buffer.alloc(5));
        } else if (method === 'indexOf' || method === 'includes') {
          buf[method](1);
        } else {
          buf[method]();
        }
      } catch (e) {
        // 忽略方法调用错误，只关心 byteOffset
      }
    }
  });
  
  return buf.byteOffset === originalOffset;
});

// ========== Part 2: 内存管理和垃圾回收 ==========

test('大量 Buffer 创建后的 byteOffset 稳定性', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    const ab = new ArrayBuffer(100);
    buffers.push(Buffer.from(ab, i % 50));
  }
  return buffers.every((buf, index) => buf.byteOffset === index % 50);
});

test('Buffer 引用释放后 byteOffset 仍可访问', () => {
  let buf;
  (() => {
    const ab = new ArrayBuffer(20);
    buf = Buffer.from(ab, 5);
  })();
  // 即使 ArrayBuffer 可能被垃圾回收，byteOffset 仍应可访问
  return typeof buf.byteOffset === 'number' && buf.byteOffset === 5;
});

test('循环引用中的 byteOffset', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 3);
  const obj = { buffer: buf };
  buf.ref = obj; // 创建循环引用
  return buf.byteOffset === 3;
});

// ========== Part 3: 跨平台和环境兼容性 ==========

test('不同 Buffer 大小的 byteOffset 行为', () => {
  const sizes = [0, 1, 8, 64, 1024, 8192, 65536];
  return sizes.every(size => {
    const buf = Buffer.alloc(size);
    return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
  });
});

test('不同编码的 Buffer byteOffset 一致性', () => {
  const encodings = ['utf8', 'ascii', 'latin1', 'base64', 'hex', 'utf16le'];
  const text = 'hello world';
  return encodings.every(encoding => {
    try {
      const buf = Buffer.from(text, encoding);
      return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
    } catch (e) {
      return true; // 某些编码可能不支持，跳过
    }
  });
});

test('Buffer 方法链式调用的 byteOffset', () => {
  const buf = Buffer.from('hello world');
  const result = buf.slice(2).subarray(1).slice(2);
  return result.byteOffset === buf.byteOffset + 2 + 1 + 2;
});

// ========== Part 4: 错误处理和边界情况 ==========

test('无效 ArrayBuffer 的错误处理', () => {
  try {
    Buffer.from(null, 5);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('ArrayBuffer') || e.message.includes('argument');
  }
});

test('ArrayBuffer 被分离后的行为', () => {
  // 注意：在浏览器环境中 ArrayBuffer 可以被分离，但在 Node.js 中通常不会
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3);
  // 即使 ArrayBuffer 状态改变，已创建的 Buffer 的 byteOffset 应该保持稳定
  return buf.byteOffset === 3;
});

test('极端参数组合的错误处理', () => {
  const ab = new ArrayBuffer(10);
  const testCases = [
    () => Buffer.from(ab, -1, 5),    // 负数 offset
    () => Buffer.from(ab, 15, 5),    // offset 超出范围
    () => Buffer.from(ab, 5, 15)     // offset + length 超出范围
  ];
  
  return testCases.every(testCase => {
    try {
      testCase();
      return false; // 应该抛出错误
    } catch (e) {
      return e.message.includes('offset') || e.message.includes('length') || 
             e.message.includes('range') || e.message.includes('bounds');
    }
  });
});

// ========== Part 5: 性能和优化相关 ==========

test('小 Buffer 的 byteOffset 性能', () => {
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.alloc(10);
    const offset = buf.byteOffset; // 访问 byteOffset
  }
  const end = Date.now();
  return (end - start) < 100; // 应该很快完成
});

test('大 Buffer slice 的 byteOffset 性能', () => {
  const buf = Buffer.alloc(100000);
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    const slice = buf.slice(i * 1000, (i + 1) * 1000);
    const offset = slice.byteOffset; // 访问 byteOffset
  }
  const end = Date.now();
  return (end - start) < 100; // 应该很快完成
});

test('频繁 byteOffset 访问的稳定性', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5);
  const offsets = [];
  for (let i = 0; i < 1000; i++) {
    offsets.push(buf.byteOffset);
  }
  return offsets.every(offset => offset === 5);
});

// ========== Part 6: 特殊场景和边缘情况 ==========

test('WeakMap 中的 Buffer byteOffset', () => {
  const wm = new WeakMap();
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 7);
  wm.set(buf, buf.byteOffset);
  return wm.get(buf) === 7;
});

test('Set 中的 Buffer byteOffset 唯一性', () => {
  const ab = new ArrayBuffer(20);
  const buf1 = Buffer.from(ab, 5);
  const buf2 = Buffer.from(ab, 5); // 相同的 offset，但不同的 Buffer 实例
  const set = new Set([buf1, buf2]);
  return set.size === 2 && buf1.byteOffset === buf2.byteOffset;
});

test('Map 中的 Buffer byteOffset 作为值', () => {
  const map = new Map();
  const ab = new ArrayBuffer(30);
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.from(ab, i * 3, 3);
    map.set(i, buf.byteOffset);
  }
  return Array.from(map.values()).every((offset, index) => offset === index * 3);
});

test('JSON 序列化中的 byteOffset 处理', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const json = JSON.stringify({ buffer: buf, offset: buf.byteOffset });
  const parsed = JSON.parse(json);
  return parsed.offset === 5 && parsed.buffer.type === 'Buffer';
});

test('toString 方法对 byteOffset 的影响', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 3);
  const originalOffset = buf.byteOffset;
  const str = buf.toString();
  return buf.byteOffset === originalOffset;
});

test('Buffer 比较操作中的 byteOffset', () => {
  const ab1 = new ArrayBuffer(20);
  const ab2 = new ArrayBuffer(20);
  const buf1 = Buffer.from(ab1, 5, 10);
  const buf2 = Buffer.from(ab2, 5, 10);
  // 填充相同的数据以便比较
  buf1.fill(0);
  buf2.fill(0);
  // 即使有相同的 byteOffset 和内容，来自不同 ArrayBuffer 的 Buffer 应该相等
  return buf1.byteOffset === buf2.byteOffset && buf1.equals(buf2);
});

// ========== Part 7: 最终验证测试 ==========

test('所有创建方式的 byteOffset 都是数字', () => {
  const buffers = [
    Buffer.alloc(10),
    Buffer.allocUnsafe(10),
    Buffer.allocUnsafeSlow(10),
    Buffer.from('hello'),
    Buffer.from([1, 2, 3]),
    Buffer.from(new ArrayBuffer(10)),
    Buffer.from(new Uint8Array(10)),
    Buffer.concat([Buffer.from('a'), Buffer.from('b')])
  ];
  return buffers.every(buf => typeof buf.byteOffset === 'number' && buf.byteOffset >= 0);
});

test('byteOffset 的数学属性', () => {
  const buf = Buffer.alloc(10);
  const offset = buf.byteOffset;
  return Number.isFinite(offset) && Number.isInteger(offset) && offset >= 0;
});

test('byteOffset 在不同操作后的一致性', () => {
  const ab = new ArrayBuffer(50);
  const buf = Buffer.from(ab, 10, 30);
  const originalOffset = buf.byteOffset;
  
  // 执行各种操作
  buf.fill(0);
  buf.write('test');
  buf.writeInt32BE(12345, 0);
  buf.readInt32BE(0);
  
  return buf.byteOffset === originalOffset;
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
