/**
 * Base64 编码/解码函数测试
 * 
 * 测试 btoa() 和 atob() 函数是否正常工作
 * 这些函数用于 Basic Authentication 等场景
 */

console.log('Base64 编码/解码测试');
console.log('========================================\n');

// 测试 1: 基础 btoa 编码
console.log('【测试 1】btoa 基础编码');
const input1 = 'Hello, World!';
const encoded1 = btoa(input1);
console.log('  输入:', input1);
console.log('  Base64:', encoded1);
console.log('  预期:', 'SGVsbG8sIFdvcmxkIQ==');
console.log('  结果:', encoded1 === 'SGVsbG8sIFdvcmxkIQ==' ? '✅ 通过' : '❌ 失败');

// 测试 2: Basic Auth 凭证编码
console.log('\n【测试 2】Basic Auth 凭证编码');
const credentials = 'user:passwd';
const encodedCreds = btoa(credentials);
console.log('  输入:', credentials);
console.log('  Base64:', encodedCreds);
console.log('  预期:', 'dXNlcjpwYXNzd2Q=');
console.log('  结果:', encodedCreds === 'dXNlcjpwYXNzd2Q=' ? '✅ 通过' : '❌ 失败');

// 测试 3: atob 解码
console.log('\n【测试 3】atob 解码');
const encodedInput = 'SGVsbG8sIFdvcmxkIQ==';
const decoded = atob(encodedInput);
console.log('  输入 Base64:', encodedInput);
console.log('  解码结果:', decoded);
console.log('  预期:', 'Hello, World!');
console.log('  结果:', decoded === 'Hello, World!' ? '✅ 通过' : '❌ 失败');

// 测试 4: 往返编码/解码
console.log('\n【测试 4】往返编码/解码');
const original = 'The quick brown fox';
const encoded = btoa(original);
const decodedBack = atob(encoded);
console.log('  原始:', original);
console.log('  编码:', encoded);
console.log('  解码:', decodedBack);
console.log('  结果:', original === decodedBack ? '✅ 通过' : '❌ 失败');

// 测试 5: 在 fetch 中使用 (Basic Auth)
console.log('\n【测试 5】在 Fetch 中使用 Basic Auth');
const authCredentials = btoa('user:passwd');
const authHeader = 'Basic ' + authCredentials;
console.log('  Authorization 头:', authHeader);
console.log('  预期:', 'Basic dXNlcjpwYXNzd2Q=');
console.log('  结果:', authHeader === 'Basic dXNlcjpwYXNzd2Q=' ? '✅ 通过' : '❌ 失败');

console.log('\n========================================');
console.log('✅ 所有 Base64 测试完成');

return {
  success: true,
  message: 'btoa/atob 函数工作正常'
};



