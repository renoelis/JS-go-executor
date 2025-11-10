const crypto = require('crypto');

console.log('=== DataView 调试测试 ===\n');

// 创建 DataView
const ab = new Uint8Array([65, 66, 67]).buffer;
const dv = new DataView(ab);

console.log('DataView 属性:');
console.log('- byteLength:', dv.byteLength);
console.log('- byteOffset:', dv.byteOffset);
console.log('- buffer:', dv.buffer);
console.log('- buffer.byteLength:', dv.buffer.byteLength);
console.log('- getUint8:', typeof dv.getUint8);

// 尝试读取数据
try {
  console.log('\n尝试通过 getUint8 读取:');
  for (let i = 0; i < dv.byteLength; i++) {
    console.log(`  dv.getUint8(${i}) =`, dv.getUint8(i));
  }
} catch (e) {
  console.log('✗ getUint8 失败:', e.message);
}

// 测试加密
try {
  console.log('\n测试 publicEncrypt with DataView:');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  
  const enc = crypto.publicEncrypt(publicKey, dv);
  console.log('✓ 加密成功，长度:', enc.length);
  
  const dec = crypto.privateDecrypt(privateKey, enc);
  console.log('✓ 解密成功:', dec.toString());
  
  if (dec.toString() === 'ABC') {
    console.log('✓ DataView 测试通过！');
  } else {
    console.log('✗ 解密结果不匹配，期望 ABC，得到:', dec.toString());
  }
} catch (e) {
  console.log('✗ 加密/解密失败:', e.message);
  console.log('Stack:', e.stack);
}

return { success: true };
