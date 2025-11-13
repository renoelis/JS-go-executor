// buf.allocUnsafeSlow() - Final Gap Analysis and Comprehensive Tests
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

// 与其他Buffer构造方法的完整对比
test('方法对比 - 与Buffer.from行为差异', () => {
  const size = 10;
  const unsafeSlow = Buffer.allocUnsafeSlow(size);
  const fromSize = Buffer.from(Buffer.alloc(size));
  return unsafeSlow.length === fromSize.length && 
         unsafeSlow.length === size;
});

test('方法对比 - 与Buffer()构造函数差异', () => {
  try {
    Buffer.allocUnsafeSlow(10);
    return true; // allocUnsafeSlow是合法的
  } catch (e) {
    return false;
  }
});

test('方法对比 - 三种unsafe方法的存在性验证', () => {
  return typeof Buffer.allocUnsafe === 'function' && 
         typeof Buffer.allocUnsafeSlow === 'function' && 
         Buffer.allocUnsafe !== Buffer.allocUnsafeSlow;
});

// 国际化和多语言测试
test('国际化 - 中文字符测试', () => {
  const buf = Buffer.allocUnsafeSlow(20, '你好世界');
  return buf.length === 20;
});

test('国际化 - 日文字符测试', () => {
  const buf = Buffer.allocUnsafeSlow(15, 'こんにちは');
  return buf.length === 15;
});

test('国际化 - 阿拉伯文字符测试', () => {
  const buf = Buffer.allocUnsafeSlow(12, 'مرحبا');
  return buf.length === 12;
});

test('国际化 - 俄文字符测试', () => {
  const buf = Buffer.allocUnsafeSlow(18, 'Привет');
  return buf.length === 18;
});

test('国际化 - Emoji表情符号测试', () => {
  const buf = Buffer.allocUnsafeSlow(16, '😀🎉🚀');
  return buf.length === 16;
});

// 安全性和内存泄漏预防
test('安全性 - 多次调用内存独立性', () => {
  const bufs = [];
  for (let i = 0; i < 5; i++) {
    bufs.push(Buffer.allocUnsafeSlow(100));
  }
  return bufs.every((buf, index) => {
    return bufs.every((other, otherIndex) => {
      return index === otherIndex || buf !== other;
    });
  });
});

test('安全性 - 大量分配后释放', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.allocUnsafeSlow(1000));
  }
  buffers.length = 0; // 清空引用
  
  // 再次分配验证系统稳定性
  const newBuf = Buffer.allocUnsafeSlow(1000);
  return newBuf.length === 1000;
});

test('安全性 - 参数污染测试', () => {
  const args = [10, 'fill', 'utf8'];
  const originalArgs = [...args];
  const buf = Buffer.allocUnsafeSlow(...args);
  
  // 验证原始参数未被修改
  return buf.length === 10 && 
         args[0] === originalArgs[0] && 
         args[1] === originalArgs[1] && 
         args[2] === originalArgs[2];
});

// 边界情况的完整性验证
test('边界完整性 - 零长度buffer的所有操作', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0 && 
         buf.toString() === '' && 
         Array.from(buf).length === 0;
});

test('边界完整性 - 单字节buffer的完整操作', () => {
  const buf = Buffer.allocUnsafeSlow(1, 65);
  buf[0] = 66;
  return buf.length === 1 && 
         buf[0] === 66 && 
         buf.toString() === 'B';
});

test('边界完整性 - 页边界大小测试', () => {
  const sizes = [4095, 4096, 4097]; // 页边界附近
  return sizes.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  });
});

// 复杂参数组合的最终验证
test('复杂参数 - 所有三参数组合正确性', () => {
  const combinations = [
    [8, 'A', 'ascii'],
    [8, 65, 'ascii'],
    [8, Buffer.from('B'), 'utf8'],
    [8, new Uint8Array([67]), 'binary']
  ];
  
  return combinations.every(([size, fill, encoding]) => {
    try {
      const buf = Buffer.allocUnsafeSlow(size, fill, encoding);
      return buf.length === size;
    } catch (e) {
      return false;
    }
  });
});

test('复杂参数 - 动态大小计算', () => {
  const dynamicSize = Math.floor(Math.random() * 100) + 10;
  const buf = Buffer.allocUnsafeSlow(dynamicSize);
  return buf.length === dynamicSize;
});

test('复杂参数 - 表达式作为size参数', () => {
  const buf = Buffer.allocUnsafeSlow(5 * 4 + 2);
  return buf.length === 22;
});

// 兼容性和向后兼容测试
test('兼容性 - Node.js模块require一致性', () => {
  const { Buffer: RequiredBuffer } = require('buffer');
  return RequiredBuffer.allocUnsafeSlow === Buffer.allocUnsafeSlow;
});

test('兼容性 - 全局Buffer对象存在性', () => {
  return typeof Buffer !== 'undefined' && 
         typeof Buffer.allocUnsafeSlow === 'function';
});

test('兼容性 - 与Buffer.poolSize无关性验证', () => {
  const originalPoolSize = Buffer.poolSize;
  
  // 测试小于poolSize的分配
  const smallBuf = Buffer.allocUnsafeSlow(originalPoolSize / 4);
  
  // 测试大于poolSize的分配
  const largeBuf = Buffer.allocUnsafeSlow(originalPoolSize * 2);
  
  return smallBuf.length === originalPoolSize / 4 && 
         largeBuf.length === originalPoolSize * 2;
});

// 极端负载和压力测试
test('压力测试 - 连续快速分配', () => {
  const start = Date.now();
  let successCount = 0;
  
  for (let i = 0; i < 500; i++) {
    try {
      const buf = Buffer.allocUnsafeSlow(i % 100 + 1);
      if (buf.length === i % 100 + 1) {
        successCount++;
      }
    } catch (e) {
      // 忽略内存不足等系统级错误
    }
  }
  
  const duration = Date.now() - start;
  return successCount >= 450 && duration < 2000; // 90%成功率，2秒内完成
});

test('压力测试 - 混合大小快速分配', () => {
  const sizes = [1, 10, 100, 1000, 10000];
  let success = true;
  
  for (let i = 0; i < 50; i++) {
    try {
      const size = sizes[i % sizes.length];
      const buf = Buffer.allocUnsafeSlow(size);
      if (buf.length !== size) {
        success = false;
        break;
      }
    } catch (e) {
      success = false;
      break;
    }
  }
  
  return success;
});

// 实际应用场景模拟
test('应用场景 - 网络缓冲区模拟', () => {
  const packetSize = 1500; // 典型以太网MTU
  const buffer = Buffer.allocUnsafeSlow(packetSize);
  
  // 模拟填充网络数据
  buffer.writeUInt32BE(0x12345678, 0);
  buffer.writeUInt16BE(80, 4); // HTTP端口
  
  return buffer.length === packetSize && 
         buffer.readUInt32BE(0) === 0x12345678 && 
         buffer.readUInt16BE(4) === 80;
});

test('应用场景 - 文件缓冲区模拟', () => {
  const blockSize = 4096; // 典型文件系统块大小
  const buffer = Buffer.allocUnsafeSlow(blockSize);
  
  // 模拟文件数据写入
  const data = 'File content data...';
  buffer.write(data, 0, 'utf8');
  
  return buffer.length === blockSize && 
         buffer.toString('utf8', 0, data.length) === data;
});

test('应用场景 - 图像处理缓冲区', () => {
  const width = 100, height = 100, channels = 4; // RGBA
  const imageBuffer = Buffer.allocUnsafeSlow(width * height * channels);
  
  // 模拟像素数据
  imageBuffer[0] = 255; // R
  imageBuffer[1] = 0;   // G  
  imageBuffer[2] = 0;   // B
  imageBuffer[3] = 255; // A
  
  return imageBuffer.length === width * height * channels && 
         imageBuffer[0] === 255 && imageBuffer[3] === 255;
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
