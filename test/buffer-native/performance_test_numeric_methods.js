/**
 * Buffer 数值读写方法性能测试
 * 测试场景：大批量数值读写操作，验证优化后的性能提升
 */

const { Buffer } = require('buffer');

function benchmark(name, fn, iterations = 10000) {
  const start = Date.now();
  fn(iterations);
  const end = Date.now();
  const duration = end - start;
  const opsPerSec = Math.round((iterations / duration) * 1000);

  return {
    name: name,
    duration: duration + 'ms',
    iterations: iterations,
    opsPerSec: opsPerSec + ' ops/sec'
  };
}

const results = [];

try {
  // 创建一个足够大的 Buffer 用于测试
  const bufferSize = 1024 * 1024; // 1MB
  const buf = Buffer.allocUnsafe(bufferSize);

  // 测试 1: readInt8 / writeInt8
  results.push(benchmark('readInt8/writeInt8', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 1) % (bufferSize - 1);
      buf.writeInt8(i & 0x7F, offset);
      const val = buf.readInt8(offset);
    }
  }));

  // 测试 2: readUInt8 / writeUInt8
  results.push(benchmark('readUInt8/writeUInt8', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 1) % (bufferSize - 1);
      buf.writeUInt8(i & 0xFF, offset);
      const val = buf.readUInt8(offset);
    }
  }));

  // 测试 3: readInt16BE / writeInt16BE
  results.push(benchmark('readInt16BE/writeInt16BE', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 2) % (bufferSize - 2);
      buf.writeInt16BE(i & 0x7FFF, offset);
      const val = buf.readInt16BE(offset);
    }
  }));

  // 测试 4: readInt16LE / writeInt16LE
  results.push(benchmark('readInt16LE/writeInt16LE', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 2) % (bufferSize - 2);
      buf.writeInt16LE(i & 0x7FFF, offset);
      const val = buf.readInt16LE(offset);
    }
  }));

  // 测试 5: readInt32BE / writeInt32BE
  results.push(benchmark('readInt32BE/writeInt32BE', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 4) % (bufferSize - 4);
      buf.writeInt32BE(i, offset);
      const val = buf.readInt32BE(offset);
    }
  }));

  // 测试 6: readInt32LE / writeInt32LE
  results.push(benchmark('readInt32LE/writeInt32LE', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 4) % (bufferSize - 4);
      buf.writeInt32LE(i, offset);
      const val = buf.readInt32LE(offset);
    }
  }));

  // 测试 7: readFloatBE / writeFloatBE
  results.push(benchmark('readFloatBE/writeFloatBE', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 4) % (bufferSize - 4);
      buf.writeFloatBE(i * 0.5, offset);
      const val = buf.readFloatBE(offset);
    }
  }));

  // 测试 8: readFloatLE / writeFloatLE
  results.push(benchmark('readFloatLE/writeFloatLE', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 4) % (bufferSize - 4);
      buf.writeFloatLE(i * 0.5, offset);
      const val = buf.readFloatLE(offset);
    }
  }));

  // 测试 9: readDoubleBE / writeDoubleBE
  results.push(benchmark('readDoubleBE/writeDoubleBE', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 8) % (bufferSize - 8);
      buf.writeDoubleBE(i * 0.5, offset);
      const val = buf.readDoubleBE(offset);
    }
  }));

  // 测试 10: readDoubleLE / writeDoubleLE
  results.push(benchmark('readDoubleLE/writeDoubleLE', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 8) % (bufferSize - 8);
      buf.writeDoubleLE(i * 0.5, offset);
      const val = buf.readDoubleLE(offset);
    }
  }));

  // 测试 11: 混合读写 - 模拟实际使用场景
  results.push(benchmark('Mixed read/write operations', (iterations) => {
    for (let i = 0; i < iterations; i++) {
      const offset = (i * 16) % (bufferSize - 16);

      // 写入不同类型的数据
      buf.writeInt8(i & 0x7F, offset);
      buf.writeInt16BE(i & 0x7FFF, offset + 1);
      buf.writeInt32LE(i, offset + 3);
      buf.writeDoubleBE(i * 0.5, offset + 7);

      // 读取数据
      const v1 = buf.readInt8(offset);
      const v2 = buf.readInt16BE(offset + 1);
      const v3 = buf.readInt32LE(offset + 3);
      const v4 = buf.readDoubleBE(offset + 7);
    }
  }));

  const testResults = {
    success: true,
    bufferSize: bufferSize,
    benchmarks: results
  };

  console.log(JSON.stringify(testResults, null, 2));
  return testResults;

} catch (error) {
  const testResults = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(testResults, null, 2));
  return testResults;
}
