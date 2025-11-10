const { Buffer } = require('buffer');

const buf = Buffer.from([1, 2, 3]);
const iter = buf[Symbol.iterator]();

console.log('=== 测试迭代器对象 ===');

// 1. 检查自身属性
console.log('Object.keys(iter):', Object.keys(iter));
console.log('Object.getOwnPropertyNames(iter):', Object.getOwnPropertyNames(iter));

// 2. 检查 hasOwnProperty
console.log('iter.hasOwnProperty("next"):', iter.hasOwnProperty('next'));
console.log('iter.hasOwnProperty(Symbol.toStringTag):', iter.hasOwnProperty(Symbol.toStringTag));

// 3. 检查 in 操作符
console.log('"next" in iter:', 'next' in iter);
console.log('Symbol.toStringTag in iter:', Symbol.toStringTag in iter);

// 4. 检查属性描述符（自身）
console.log('\n=== 自身属性描述符 ===');
const ownDesc = Object.getOwnPropertyDescriptor(iter, 'next');
console.log('Own descriptor for "next":', ownDesc);

const ownSymDesc = Object.getOwnPropertyDescriptor(iter, Symbol.toStringTag);
console.log('Own descriptor for Symbol.toStringTag:', ownSymDesc);

// 5. for...in 测试
console.log('\n=== for...in 测试 ===');
const keys = [];
for (const key in iter) {
  keys.push(key);
  console.log('Found enumerable key:', key);
  
  // 检查这个key的属性描述符
  const desc = Object.getOwnPropertyDescriptor(iter, key);
  console.log(`  Own descriptor:`, desc);
}

console.log('Total for...in keys:', keys.length);

// 6. 测试普通对象对比
console.log('\n=== 对比：普通对象 ===');
const normalObj = {};
Object.defineProperty(normalObj, 'test', {
  value: 'value',
  writable: true,
  enumerable: false,
  configurable: true
});

const normalKeys = [];
for (const key in normalObj) {
  normalKeys.push(key);
}
console.log('Normal object for...in keys:', normalKeys.length);

return {
  forInKeys: keys,
  success: keys.length === 0,
  hasOwn: iter.hasOwnProperty('next'),
  ownKeys: Object.keys(iter),
  normalObjTest: normalKeys.length === 0
};
