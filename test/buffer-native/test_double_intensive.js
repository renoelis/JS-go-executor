/**
 * 性能对比：单一方法密集测试
 */

const { Buffer } = require('buffer');

function benchmark(name, fn, iterations) {
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

try {
  const buf = Buffer.allocUnsafe(1024);
  const iterations = 100000; // 增加到 100k

  const results = [];

  // 只测试 readDoubleBE
  results.push(benchmark('readDoubleBE (100k)', (n) => {
    for (let i = 0; i < n; i++) {
      const offset = (i * 8) % (buf.length - 8);
      buf.readDoubleBE(offset);
    }
  }, iterations));

  // 只测试 writeDoubleBE
  results.push(benchmark('writeDoubleBE (100k)', (n) => {
    for (let i = 0; i < n; i++) {
      const offset = (i * 8) % (buf.length - 8);
      buf.writeDoubleBE(i * 0.5, offset);
    }
  }, iterations));

  // 测试 read + write
  results.push(benchmark('read+write DoubleBE (100k)', (n) => {
    for (let i = 0; i < n; i++) {
      const offset = (i * 8) % (buf.length - 8);
      buf.writeDoubleBE(i * 0.5, offset);
      buf.readDoubleBE(offset);
    }
  }, iterations));

  const testResults = {
    success: true,
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
