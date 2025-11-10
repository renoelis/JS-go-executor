// 测试 goja 的 for...in 对原型链不可枚举属性的处理

console.log('=== 测试1: 普通对象的不可枚举属性 ===');
const obj1 = {};
Object.defineProperty(obj1, 'test', {
  value: 'value',
  writable: true,
  enumerable: false,
  configurable: true
});

const keys1 = [];
for (const key in obj1) {
  keys1.push(key);
}
console.log('for...in keys:', keys1.length); // 应该是 0

console.log('\n=== 测试2: Object.create 创建的对象 ===');
const proto2 = {};
Object.defineProperty(proto2, 'test', {
  value: 'value',
  writable: true,
  enumerable: false,
  configurable: true
});

const obj2 = Object.create(proto2);
const keys2 = [];
for (const key in obj2) {
  keys2.push(key);
}
console.log('for...in keys:', keys2.length); // 应该是 0
console.log('hasOwnProperty:', obj2.hasOwnProperty('test')); // 应该是 false
console.log('"test" in obj2:', 'test' in obj2); // 应该是 true

return {
  test1: keys1.length === 0,
  test2: keys2.length === 0,
  allPassed: keys1.length === 0 && keys2.length === 0
};
