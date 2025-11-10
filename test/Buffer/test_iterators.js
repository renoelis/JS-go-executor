const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  Buffer 迭代器测试');
console.log('========================================\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    console.log(`\n[测试 ${testCount}] ${name}`);
    fn();
    passCount++;
    console.log('✓ 通过');
  } catch (e) {
    failCount++;
    console.log('✗ 失败:', e.message);
  }
}

// ============ 迭代器测试 ============

test('1. entries() 返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  
  if (typeof iter.next !== 'function') {
    throw new Error('entries() 应该返回带 next() 方法的对象');
  }
  
  console.log('    entries() 返回了迭代器对象');
});

test('2. entries() 迭代器工作正常', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  
  let result1 = iter.next();
  if (result1.done !== false) {
    throw new Error('第一次调用 next() 应该返回 done: false');
  }
  if (!Array.isArray(result1.value) || result1.value[0] !== 0 || result1.value[1] !== 10) {
    throw new Error(`第一次应该返回 [0, 10]，实际: [${result1.value}]`);
  }
  
  let result2 = iter.next();
  if (result2.value[0] !== 1 || result2.value[1] !== 20) {
    throw new Error(`第二次应该返回 [1, 20]，实际: [${result2.value}]`);
  }
  
  let result3 = iter.next();
  if (result3.value[0] !== 2 || result3.value[1] !== 30) {
    throw new Error(`第三次应该返回 [2, 30]，实际: [${result3.value}]`);
  }
  
  let result4 = iter.next();
  if (result4.done !== true) {
    throw new Error('迭代结束后应该返回 done: true');
  }
  
  console.log('    entries() 迭代器正确工作');
});

test('3. keys() 返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  
  if (typeof iter.next !== 'function') {
    throw new Error('keys() 应该返回带 next() 方法的对象');
  }
  
  console.log('    keys() 返回了迭代器对象');
});

test('4. keys() 迭代器工作正常', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.keys();
  
  let result1 = iter.next();
  if (result1.value !== 0 || result1.done !== false) {
    throw new Error(`应该返回 {value: 0, done: false}，实际: ${JSON.stringify(result1)}`);
  }
  
  let result2 = iter.next();
  if (result2.value !== 1) {
    throw new Error(`应该返回 value: 1，实际: ${result2.value}`);
  }
  
  let result3 = iter.next();
  if (result3.value !== 2) {
    throw new Error(`应该返回 value: 2，实际: ${result3.value}`);
  }
  
  let result4 = iter.next();
  if (result4.done !== true) {
    throw new Error('迭代结束后应该返回 done: true');
  }
  
  console.log('    keys() 迭代器正确工作');
});

test('5. values() 返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  if (typeof iter.next !== 'function') {
    throw new Error('values() 应该返回带 next() 方法的对象');
  }
  
  console.log('    values() 返回了迭代器对象');
});

test('6. values() 迭代器工作正常', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.values();
  
  let result1 = iter.next();
  if (result1.value !== 10 || result1.done !== false) {
    throw new Error(`应该返回 {value: 10, done: false}，实际: ${JSON.stringify(result1)}`);
  }
  
  let result2 = iter.next();
  if (result2.value !== 20) {
    throw new Error(`应该返回 value: 20，实际: ${result2.value}`);
  }
  
  let result3 = iter.next();
  if (result3.value !== 30) {
    throw new Error(`应该返回 value: 30，实际: ${result3.value}`);
  }
  
  let result4 = iter.next();
  if (result4.done !== true) {
    throw new Error('迭代结束后应该返回 done: true');
  }
  
  console.log('    values() 迭代器正确工作');
});

test('7. 空 Buffer 迭代器', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.values();
  
  let result = iter.next();
  if (result.done !== true) {
    throw new Error('空 Buffer 应该立即返回 done: true');
  }
  
  console.log('    空 Buffer 迭代器正确工作');
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('测试总结:');
console.log(`  总计: ${testCount} 个测试`);
console.log(`  通过: ${passCount} 个`);
console.log(`  失败: ${failCount} 个`);
console.log('========================================');

return {
  total: testCount,
  passed: passCount,
  failed: failCount,
  successRate: ((passCount / testCount) * 100).toFixed(1) + '%'
};
