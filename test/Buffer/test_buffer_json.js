// 测试 Buffer.toJSON 方法
const Buffer = require('buffer').Buffer;

// 创建 Buffer
const buf = Buffer.from('test', 'utf8');

// 测试 1: 直接返回 Buffer（应该自动调用 toJSON）
return buf;


