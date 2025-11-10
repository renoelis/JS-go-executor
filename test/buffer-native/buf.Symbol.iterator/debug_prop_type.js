const { Buffer } = require('buffer');

const buf = Buffer.from([1, 2, 3]);
const iter = buf[Symbol.iterator]();

console.log('=== 检查迭代器对象的属性类型 ===');

// 1. 检查 next 属性的描述符
try {
  const desc = Object.getOwnPropertyDescriptor(iter, 'next');
  console.log('iter 自身的 next 描述符:', desc);
} catch (e) {
  console.log('获取自身描述符失败:', e.message);
}

// 2. 检查 Symbol.toStringTag
try {
  const desc = Object.getOwnPropertyDescriptor(iter, Symbol.toStringTag);
  console.log('iter 自身的 Symbol.toStringTag 描述符:', desc);
} catch (e) {
  console.log('获取自身 Symbol 描述符失败:', e.message);
}

// 3. 检查属性
console.log('\n=== 属性检查 ===');
console.log('iter.next 类型:', typeof iter.next);
console.log('iter.next === undefined:', iter.next === undefined);
console.log('"next" in iter:', 'next' in iter);
console.log('iter.hasOwnProperty("next"):', iter.hasOwnProperty('next'));
console.log('iter.propertyIsEnumerable("next"):', iter.propertyIsEnumerable('next'));

// 4. for...in 测试
console.log('\n=== for...in 测试 ===');
const keys = [];
for (const key in iter) {
  keys.push(key);
  console.log(`Found key: "${key}"`);
}
console.log('Total keys:', keys.length);

// 5. 测试迭代器功能
console.log('\n=== 迭代器功能测试 ===');
const result1 = iter.next();
console.log('iter.next():', JSON.stringify(result1));

return {
  forInKeys: keys,
  success: keys.length === 0
};
