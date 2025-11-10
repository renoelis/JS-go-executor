// 测试 writeFloatBE 错误码（Go+goja 服务）
const { Buffer } = require('buffer');

const results = [];

console.log('=== 测试 writeFloatBE 错误码 (Go+goja) ===\n');

// 测试 1: Buffer 长度不足
try {
  const buf = Buffer.alloc(3); // 只有 3 字节，需要 4 字节
  buf.writeFloatBE(3.14, 0);
  results.push({ test: 'Buffer 长度不足', status: '❌', error: '未抛出错误' });
} catch (e) {
  console.log('测试 1: Buffer 长度不足');
  console.log('  错误类型:', e.name);
  console.log('  错误码:', e.code);
  console.log('  错误消息:', e.message);
  console.log();
  results.push({
    test: 'Buffer 长度不足',
    status: e.code === 'ERR_BUFFER_OUT_OF_BOUNDS' ? '✅' : '❌',
    errorCode: e.code,
    expected: 'ERR_BUFFER_OUT_OF_BOUNDS'
  });
}

// 测试 2: offset 越界
try {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 1); // offset=1 会越界
  results.push({ test: 'offset 越界', status: '❌', error: '未抛出错误' });
} catch (e) {
  console.log('测试 2: offset 越界');
  console.log('  错误类型:', e.name);
  console.log('  错误码:', e.code);
  console.log('  错误消息:', e.message);
  console.log();
  results.push({
    test: 'offset 越界',
    status: e.code === 'ERR_OUT_OF_RANGE' ? '✅' : '❌',
    errorCode: e.code,
    expected: 'ERR_OUT_OF_RANGE'
  });
}

// 测试 3: offset 为字符串
try {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 'invalid');
  results.push({ test: 'offset 为字符串', status: '❌', error: '未抛出错误' });
} catch (e) {
  console.log('测试 3: offset 为字符串');
  console.log('  错误类型:', e.name);
  console.log('  错误码:', e.code);
  console.log('  错误消息:', e.message);
  console.log();
  results.push({
    test: 'offset 为字符串',
    status: e.code === 'ERR_INVALID_ARG_TYPE' ? '✅' : '❌',
    errorCode: e.code,
    expected: 'ERR_INVALID_ARG_TYPE'
  });
}

// 测试 4: offset 为小数
try {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 0.5);
  results.push({ test: 'offset 为小数', status: '❌', error: '未抛出错误' });
} catch (e) {
  console.log('测试 4: offset 为小数');
  console.log('  错误类型:', e.name);
  console.log('  错误码:', e.code);
  console.log('  错误消息:', e.message);
  console.log();
  results.push({
    test: 'offset 为小数',
    status: e.code === 'ERR_OUT_OF_RANGE' ? '✅' : '❌',
    errorCode: e.code,
    expected: 'ERR_OUT_OF_RANGE'
  });
}

const passed = results.filter(r => r.status === '✅').length;
const failed = results.filter(r => r.status === '❌').length;

const result = {
  success: failed === 0,
  summary: {
    total: results.length,
    passed: passed,
    failed: failed
  },
  results: results
};

console.log(JSON.stringify(result, null, 2));
return result;
