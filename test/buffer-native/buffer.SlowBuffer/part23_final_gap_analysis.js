// Buffer.allocUnsafeSlow - 最终查缺补漏和极端边界测试
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

// 函数引用和属性稳定性
test('allocUnsafeSlow引用稳定性', () => {
  const ref1 = Buffer.allocUnsafeSlow;
  const ref2 = Buffer.allocUnsafeSlow;
  return ref1 === ref2;
});

test('allocUnsafeSlow作为变量传递', () => {
  const allocFunc = Buffer.allocUnsafeSlow;
  const buf = allocFunc(15);
  return buf instanceof Buffer && buf.length === 15;
});

test('allocUnsafeSlow在对象中存储', () => {
  const bufferUtils = {
    alloc: Buffer.allocUnsafeSlow,
    create: function(size) { return this.alloc(size); }
  };
  const buf = bufferUtils.create(25);
  return buf instanceof Buffer && buf.length === 25;
});

test('allocUnsafeSlow作为数组元素', () => {
  const functions = [Buffer.alloc, Buffer.allocUnsafe, Buffer.allocUnsafeSlow];
  const buf = functions[2](12);
  return buf instanceof Buffer && buf.length === 12;
});

// 极端数学运算边界
test('接近Number.MAX_SAFE_INTEGER的计算', () => {
  const largeNum = Number.MAX_SAFE_INTEGER - 1000000;
  try {
    const buf = Buffer.allocUnsafeSlow(largeNum);
    return false; // 如果成功创建，说明有问题
  } catch (e) {
    return e instanceof RangeError || e.message.includes('Invalid');
  }
});

test('数学运算结果作为大小参数', () => {
  const size = Math.pow(2, 4); // 16
  const buf = Buffer.allocUnsafeSlow(size);
  return buf.length === 16;
});

test('三角函数结果取整', () => {
  const size = Math.floor(Math.sin(Math.PI / 2) * 10); // 10
  const buf = Buffer.allocUnsafeSlow(size);
  return buf.length === 10;
});

test('随机数取整作为大小', () => {
  const size = Math.floor(Math.random() * 100) + 1; // 1-100
  const buf = Buffer.allocUnsafeSlow(size);
  return buf.length >= 1 && buf.length <= 100;
});

// 对象属性访问模式
test('通过方括号访问方法', () => {
  const methodName = 'allocUnsafeSlow';
  const buf = Buffer[methodName](18);
  return buf instanceof Buffer && buf.length === 18;
});

test('计算属性名访问', () => {
  const prefix = 'alloc';
  const suffix = 'UnsafeSlow';
  const buf = Buffer[prefix + suffix](22);
  return buf instanceof Buffer && buf.length === 22;
});

// 类型转换的边界情况
test('字符串数字的空格处理 - 应抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow('  10  ');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('科学计数法字符串 - 应抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow('1e1');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('十六进制字符串处理', () => {
  try {
    const buf = Buffer.allocUnsafeSlow('0x10');
    return buf.length === 0; // 通常会转换为0或抛错
  } catch (e) {
    return true; // 抛错也是预期的
  }
});

// 特殊数值边界测试
test('Number.EPSILON作为大小', () => {
  const buf = Buffer.allocUnsafeSlow(Number.EPSILON);
  return buf.length === 0; // 应该被截断为0
});

test('非常小的正数', () => {
  const buf = Buffer.allocUnsafeSlow(0.000001);
  return buf.length === 0;
});

test('1减去很小的数', () => {
  const buf = Buffer.allocUnsafeSlow(1 - Number.EPSILON);
  return buf.length === 0; // 应该被截断为0
});

test('接近1的小数', () => {
  const buf = Buffer.allocUnsafeSlow(0.9999999);
  return buf.length === 0;
});

// 内存分配模式的极端测试
test('连续分配递增大小', () => {
  const buffers = [];
  for (let i = 1; i <= 10; i++) {
    buffers.push(Buffer.allocUnsafeSlow(i * 100));
  }
  return buffers.every((buf, i) => buf.length === (i + 1) * 100);
});

test('连续分配递减大小', () => {
  const buffers = [];
  for (let i = 10; i >= 1; i--) {
    buffers.push(Buffer.allocUnsafeSlow(i * 50));
  }
  return buffers.every((buf, idx) => buf.length === (10 - idx) * 50);
});

test('交替大小分配模式', () => {
  const sizes = [10, 1000, 20, 2000, 30, 3000];
  const buffers = sizes.map(size => Buffer.allocUnsafeSlow(size));
  return buffers.every((buf, i) => buf.length === sizes[i]);
});

// 错误恢复和状态一致性
test('错误后正常分配恢复', () => {
  try {
    Buffer.allocUnsafeSlow(-1); // 应该失败
  } catch (e) {
    // 忽略错误
  }
  
  // 确保后续分配正常
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer && buf.length === 10;
});

test('多次错误后的状态', () => {
  const errors = [
    () => Buffer.allocUnsafeSlow(NaN),
    () => Buffer.allocUnsafeSlow(-1),
    () => Buffer.allocUnsafeSlow(Infinity)
  ];
  
  let errorCount = 0;
  errors.forEach(fn => {
    try {
      fn();
    } catch (e) {
      errorCount++;
    }
  });
  
  const buf = Buffer.allocUnsafeSlow(5);
  return errorCount === 3 && buf.length === 5;
});

// 内存对齐和平台特性测试
test('CPU字节对齐大小', () => {
  const alignedSizes = [4, 8, 16, 32, 64];
  return alignedSizes.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size && buf.byteOffset % 4 === 0;
  });
});

test('非对齐大小的内存布局', () => {
  const unalignedSizes = [3, 5, 7, 9, 11, 13];
  return unalignedSizes.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  });
});

// 算法和数据模式测试
test('斐波那契数列大小', () => {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  return fib.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  });
});

test('质数大小序列', () => {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  return primes.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  });
});

test('2的幂减1序列', () => {
  const powersMinusOne = [1, 3, 7, 15, 31, 63, 127, 255, 511, 1023];
  return powersMinusOne.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  });
});

// 实际应用模拟的极端情况
test('模拟网络包分片', () => {
  const mtu = 1500; // 以太网MTU
  const packetSizes = [mtu, mtu - 20, mtu - 40]; // 减去IP头、TCP头
  
  return packetSizes.every(size => {
    const packet = Buffer.allocUnsafeSlow(size);
    return packet.length === size;
  });
});

test('模拟加密块大小', () => {
  const blockSizes = [16, 32]; // AES块大小
  return blockSizes.every(size => {
    const block = Buffer.allocUnsafeSlow(size);
    return block.length === size && block instanceof Buffer;
  });
});

test('模拟hash输出大小', () => {
  const hashSizes = [20, 32, 48, 64]; // SHA-1, SHA-256, SHA-384, SHA-512
  return hashSizes.every(size => {
    const hash = Buffer.allocUnsafeSlow(size);
    return hash.length === size;
  });
});

// 边界条件的组合测试
test('最大允许大小和最小大小组合', () => {
  const minBuf = Buffer.allocUnsafeSlow(0);
  const smallBuf = Buffer.allocUnsafeSlow(1);
  
  return minBuf.length === 0 && smallBuf.length === 1;
});

test('常见协议头大小', () => {
  const headerSizes = [
    14, // 以太网帧头
    20, // IPv4头
    8,  // UDP头
    20, // TCP基本头
    8,  // ICMP头
  ];
  
  return headerSizes.every(size => {
    const header = Buffer.allocUnsafeSlow(size);
    return header.length === size;
  });
});

// 最终功能验证
test('allocUnsafeSlow核心特性总结验证', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  
  return buf instanceof Buffer &&           // 是Buffer实例
         buf instanceof Uint8Array &&      // 是Uint8Array实例
         buf.length === 100 &&              // 长度正确
         buf.byteOffset === 0 &&            // 不使用池（byteOffset为0）
         buf.buffer instanceof ArrayBuffer; // 有ArrayBuffer
});

test('与历史SlowBuffer语义一致性', () => {
  // allocUnsafeSlow应该表现得像旧的SlowBuffer(size)
  const buf = Buffer.allocUnsafeSlow(50);
  buf.fill(0x42);
  
  return buf.length === 50 && 
         buf[0] === 0x42 && 
         buf[49] === 0x42 &&
         buf.byteOffset === 0; // 独立分配，不使用池
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
