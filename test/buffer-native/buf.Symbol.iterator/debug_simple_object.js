// 测试简单对象的 DefineProperty 行为

const obj = {};

// 使用 defineProperty 创建不可枚举属性
Object.defineProperty(obj, 'test', {
  value: 'value',
  writable: true,
  enumerable: false,
  configurable: true
});

console.log('=== 对象自身测试 ===');
console.log('obj.propertyIsEnumerable("test"):', obj.propertyIsEnumerable('test'));
console.log('obj.hasOwnProperty("test"):', obj.hasOwnProperty('test'));

const keys1 = [];
for (const key in obj) {
  keys1.push(key);
}
console.log('for...in keys:', keys1.length);

// 创建继承该对象的子对象
const child = Object.create(obj);

console.log('\n=== 子对象测试 ===');
console.log('child.propertyIsEnumerable("test"):', child.propertyIsEnumerable('test'));
console.log('child.hasOwnProperty("test"):', child.hasOwnProperty('test'));
console.log('"test" in child:', 'test' in child);

const keys2 = [];
for (const key in child) {
  keys2.push(key);
  console.log('Found key:', key);
}
console.log('for...in keys:', keys2.length);

return {
  objForIn: keys1.length,
  childForIn: keys2.length,
  success: keys1.length === 0 && keys2.length === 0
};
