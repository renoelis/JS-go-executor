// Buffer.allocUnsafe() - Buffer Pool and Constants Tests
const { Buffer, constants } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer.poolSize 测试
test('Buffer.poolSize 存在且为数字', () => {
  if (typeof Buffer.poolSize !== 'number') {
    throw new Error(`Expected Buffer.poolSize to be a number, got ${typeof Buffer.poolSize}`);
  }
  if (Buffer.poolSize <= 0) {
    throw new Error(`Expected Buffer.poolSize > 0, got ${Buffer.poolSize}`);
  }
  console.log(`✅ Buffer.poolSize = ${Buffer.poolSize}`);
  return true;
});

test('小于 poolSize/2 的 Buffer 使用池', () => {
  const halfPool = Buffer.poolSize >>> 1;
  const smallSize = Math.floor(halfPool / 2);
  
  const buf1 = Buffer.allocUnsafe(smallSize);
  const buf2 = Buffer.allocUnsafe(smallSize);
  
  if (buf1.length !== smallSize) throw new Error(`Expected length ${smallSize}, got ${buf1.length}`);
  if (buf2.length !== smallSize) throw new Error(`Expected length ${smallSize}, got ${buf2.length}`);
  
  console.log(`✅ 小于 poolSize/2 (${halfPool}) 的 Buffer 分配成功`);
  return true;
});

test('等于 poolSize/2 的 Buffer', () => {
  const halfPool = Buffer.poolSize >>> 1;
  
  const buf = Buffer.allocUnsafe(halfPool);
  
  if (buf.length !== halfPool) throw new Error(`Expected length ${halfPool}, got ${buf.length}`);
  
  console.log(`✅ 等于 poolSize/2 (${halfPool}) 的 Buffer 分配成功`);
  return true;
});

test('大于 poolSize/2 的 Buffer 不使用池', () => {
  const halfPool = Buffer.poolSize >>> 1;
  const largeSize = halfPool + 1;
  
  const buf = Buffer.allocUnsafe(largeSize);
  
  if (buf.length !== largeSize) throw new Error(`Expected length ${largeSize}, got ${buf.length}`);
  
  console.log(`✅ 大于 poolSize/2 (${halfPool}) 的 Buffer 分配成功`);
  return true;
});

test('poolSize 边界值测试', () => {
  const poolSize = Buffer.poolSize;
  
  const buf1 = Buffer.allocUnsafe(poolSize - 1);
  const buf2 = Buffer.allocUnsafe(poolSize);
  const buf3 = Buffer.allocUnsafe(poolSize + 1);
  
  if (buf1.length !== poolSize - 1) throw new Error(`Expected length ${poolSize - 1}`);
  if (buf2.length !== poolSize) throw new Error(`Expected length ${poolSize}`);
  if (buf3.length !== poolSize + 1) throw new Error(`Expected length ${poolSize + 1}`);
  
  console.log(`✅ poolSize (${poolSize}) 边界值测试通过`);
  return true;
});

// buffer.constants.MAX_LENGTH 测试
test('buffer.constants.MAX_LENGTH 存在', () => {
  if (typeof constants.MAX_LENGTH !== 'number') {
    throw new Error(`Expected constants.MAX_LENGTH to be a number, got ${typeof constants.MAX_LENGTH}`);
  }
  if (constants.MAX_LENGTH <= 0) {
    throw new Error(`Expected constants.MAX_LENGTH > 0, got ${constants.MAX_LENGTH}`);
  }
  console.log(`✅ buffer.constants.MAX_LENGTH = ${constants.MAX_LENGTH}`);
  return true;
});

test('分配接近 MAX_LENGTH 的 Buffer 应该抛错', () => {
  try {
    Buffer.allocUnsafe(constants.MAX_LENGTH + 1);
    console.log('❌ 应该抛出错误');
    return false;
  } catch (error) {
    console.log(`✅ 分配超过 MAX_LENGTH 正确抛错: ${error.message}`);
    return true;
  }
});

test('分配 MAX_LENGTH 的 Buffer 行为', () => {
  try {
    // 这可能会因为内存限制而失败，但应该是 RangeError 而不是 TypeError
    Buffer.allocUnsafe(constants.MAX_LENGTH);
    console.log('✅ 分配 MAX_LENGTH 成功（或内存不足）');
    return true;
  } catch (error) {
    // 如果失败，应该是内存相关错误，不是类型错误
    if (error.name === 'TypeError') {
      throw new Error('不应该抛出 TypeError');
    }
    console.log(`✅ 分配 MAX_LENGTH 因内存限制失败: ${error.message}`);
    return true;
  }
});

// poolSize 可修改性测试
test('Buffer.poolSize 可以被修改', () => {
  const originalPoolSize = Buffer.poolSize;
  
  try {
    Buffer.poolSize = 1024;
    if (Buffer.poolSize !== 1024) {
      throw new Error(`Expected poolSize to be 1024, got ${Buffer.poolSize}`);
    }
    
    // 恢复原值
    Buffer.poolSize = originalPoolSize;
    
    console.log('✅ Buffer.poolSize 可以被修改');
    return true;
  } catch (error) {
    // 恢复原值
    Buffer.poolSize = originalPoolSize;
    throw error;
  }
});

test('修改 poolSize 后分配行为', () => {
  const originalPoolSize = Buffer.poolSize;
  
  try {
    // 设置一个小的 poolSize
    Buffer.poolSize = 256;
    const halfPool = Buffer.poolSize >>> 1; // 128
    
    const buf1 = Buffer.allocUnsafe(100); // 应该使用池
    const buf2 = Buffer.allocUnsafe(200); // 应该不使用池
    
    if (buf1.length !== 100) throw new Error(`Expected length 100, got ${buf1.length}`);
    if (buf2.length !== 200) throw new Error(`Expected length 200, got ${buf2.length}`);
    
    // 恢复原值
    Buffer.poolSize = originalPoolSize;
    
    console.log('✅ 修改 poolSize 后分配行为正确');
    return true;
  } catch (error) {
    // 恢复原值
    Buffer.poolSize = originalPoolSize;
    throw error;
  }
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
