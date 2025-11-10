// 测试剩余的 3 个失败项
const { v4, parse, stringify } = require('uuid');

console.log('=== 测试 V4-008: v4(null, buffer, offset) ===');
try {
  const buffer = new Array(20);
  const result = v4(null, buffer, 4);
  if (buffer[4] === undefined) {
    console.log('❌ 失败 - 偏移量写入失败');
  } else {
    console.log('✅ 通过 - 从偏移量 4 写入成功');
    console.log('   buffer[4]:', buffer[4]);
    console.log('   buffer[5]:', buffer[5]);
  }
} catch (e) {
  console.log('❌ 异常:', e.message);
}

console.log('\n=== 测试 STRINGIFY-001: stringify(Uint8Array, offset) ===');
try {
  const id = v4();
  console.log('原始 UUID:', id);
  const bytes = parse(id);
  console.log('parse 后类型:', Array.isArray(bytes) ? 'Array' : typeof bytes);
  
  const buffer = new Uint8Array(20);
  buffer.set(bytes, 4);
  console.log('Uint8Array 创建成功，长度:', buffer.length);
  console.log('buffer[4]:', buffer[4]);
  
  const reconstructed = stringify(buffer, 4);
  console.log('重建 UUID:', reconstructed);
  
  if (reconstructed.toLowerCase() === id.toLowerCase()) {
    console.log('✅ 通过 - 从偏移量读取成功');
  } else {
    console.log('❌ 失败 - UUID 不匹配');
  }
} catch (e) {
  console.log('❌ 异常:', e.message);
  console.log('Stack:', e.stack);
}

console.log('\n=== 测试 COMBO-006: v4({ random }, buffer, offset) ===');
try {
  const random = new Array(16).fill(0x88);
  const buffer = new Array(20);
  const offset = 2;
  v4({ random }, buffer, offset);
  if (buffer[offset] === undefined) {
    console.log('❌ 失败 - 组合选项失败');
  } else {
    console.log('✅ 通过 - 组合选项成功');
    console.log('   buffer[2]:', buffer[2]);
    console.log('   buffer[3]:', buffer[3]);
  }
} catch (e) {
  console.log('❌ 异常:', e.message);
}

console.log('\n=== 测试完成 ===');

