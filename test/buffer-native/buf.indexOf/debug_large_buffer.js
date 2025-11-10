// Debug large buffer indexOf issue
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ 
      name, 
      status: result.pass ? '✅' : '❌',
      details: result.details
    });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

test('大 Buffer - 2MB 查找末尾 - 详细诊断', () => {
  const size = 2 * 1024 * 1024;
  const buf = Buffer.alloc(size);
  const targetPos = buf.length - 6;
  
  buf.write('target', targetPos);
  
  // 验证写入是否成功
  const written = buf.toString('utf8', targetPos, targetPos + 6);
  
  // 执行查找
  const foundPos = buf.indexOf('target');
  
  return {
    pass: foundPos === targetPos,
    details: {
      bufferLength: buf.length,
      expectedPos: targetPos,
      foundPos: foundPos,
      writtenContent: written,
      writtenBytes: Array.from(buf.slice(targetPos, targetPos + 6)),
      searchBytes: Array.from(Buffer.from('target'))
    }
  };
});

test('大 Buffer - 1MB 查找末尾', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size);
  const targetPos = buf.length - 6;
  
  buf.write('target', targetPos);
  const foundPos = buf.indexOf('target');
  
  return {
    pass: foundPos === targetPos,
    details: {
      bufferLength: buf.length,
      expectedPos: targetPos,
      foundPos: foundPos
    }
  };
});

test('大 Buffer - 512KB 查找末尾', () => {
  const size = 512 * 1024;
  const buf = Buffer.alloc(size);
  const targetPos = buf.length - 6;
  
  buf.write('target', targetPos);
  const foundPos = buf.indexOf('target');
  
  return {
    pass: foundPos === targetPos,
    details: {
      bufferLength: buf.length,
      expectedPos: targetPos,
      foundPos: foundPos
    }
  };
});

test('大 Buffer - 100KB 查找末尾', () => {
  const size = 100 * 1024;
  const buf = Buffer.alloc(size);
  const targetPos = buf.length - 6;
  
  buf.write('target', targetPos);
  const foundPos = buf.indexOf('target');
  
  return {
    pass: foundPos === targetPos,
    details: {
      bufferLength: buf.length,
      expectedPos: targetPos,
      foundPos: foundPos
    }
  };
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
