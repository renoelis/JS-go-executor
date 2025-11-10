const { Buffer } = require('buffer');

console.log('=== 测试1: 检查原型上的属性描述符 ===');
const buf = Buffer.from([1, 2, 3]);
const iter = buf[Symbol.iterator]();

// 检查实例上的属性
console.log('iter.hasOwnProperty("next"):', iter.hasOwnProperty('next'));
console.log('Object.getOwnPropertyNames(iter):', Object.getOwnPropertyNames(iter));

// 检查 in 操作符
console.log('"next" in iter:', 'next' in iter);

// 尝试获取next的属性描述符（如果存在）
try {
  const desc = Object.getOwnPropertyDescriptor(iter, 'next');
  console.log('Own descriptor for "next":', desc);
} catch (e) {
  console.log('Error getting descriptor:', e.message);
}

// for...in 测试
console.log('\n=== 测试2: for...in 遍历 ===');
const keys = [];
for (const key in iter) {
  keys.push(key);
  console.log('Found key:', key);
  
  // 检查这个key的可枚举性
  try {
    const desc = Object.getOwnPropertyDescriptor(iter, key);
    if (desc) {
      console.log(`  Own descriptor: enumerable=${desc.enumerable}, writable=${desc.writable}, configurable=${desc.configurable}`);
    } else {
      console.log('  No own descriptor (inherited)');
    }
  } catch (e) {
    console.log('  Error:', e.message);
  }
}

console.log('Total for...in keys:', keys.length);

// 测试直接访问
console.log('\n=== 测试3: 直接访问 next ===');
console.log('typeof iter.next:', typeof iter.next);
console.log('iter.next === undefined:', iter.next === undefined);

// 测试可枚举性检查
console.log('\n=== 测试4: propertyIsEnumerable ===');
console.log('iter.propertyIsEnumerable("next"):', iter.propertyIsEnumerable('next'));

return {
  hasOwnNext: iter.hasOwnProperty('next'),
  nextInIter: 'next' in iter,
  forInCount: keys.length,
  isEnumerable: iter.propertyIsEnumerable('next'),
  success: keys.length === 0
};
