/**
 * 测试新增功能 - axios 版本
 */

const axios = require('axios');
const BASE_URL = 'https://httpbin.qingflow.dpdns.org';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  validateStatus: () => true
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

console.log('\n╔════════════════════════════════════════════════════════╗');
log('║          测试新增功能                                  ║', 'cyan');
console.log('╚════════════════════════════════════════════════════════╝\n');

// 测试 1: 空响应
(async () => {
  log('━━━ 测试 1: /empty (空响应) ━━━', 'cyan');
  try {
    const res = await client.get('/empty');
    console.log('状态码:', res.status);
    console.log('响应数据:', JSON.stringify(res.data));
    console.log('Content-Length:', res.headers['content-length']);
    if (res.status === 200 && (res.data === '' || res.data === null)) {
      log('✓ 空响应测试通过\n', 'green');
    } else {
      log('✗ 空响应测试失败\n', 'red');
    }
  } catch (err) {
    log(`✗ 错误: ${err.message}\n`, 'red');
  }
})();

// 测试 2: 204 No Content
setTimeout(async () => {
  log('━━━ 测试 2: /no-content (204 状态码) ━━━', 'cyan');
  try {
    const res = await client.get('/no-content');
    console.log('状态码:', res.status);
    console.log('响应数据:', res.data);
    console.log('自定义头:', res.headers['x-custom-header']);
    if (res.status === 204) {
      log('✓ No Content 测试通过\n', 'green');
    } else {
      log('✗ No Content 测试失败\n', 'red');
    }
  } catch (err) {
    log(`✗ 错误: ${err.message}\n`, 'red');
  }
}, 1000);

// 测试 3: 格式错误的 JSON
setTimeout(async () => {
  log('━━━ 测试 3: /malformed-json (错误的 JSON) ━━━', 'cyan');
  try {
    const res = await client.get('/malformed-json', {
      transformResponse: [(data) => data] // 不自动解析 JSON
    });
    console.log('状态码:', res.status);
    console.log('响应数据 (原始):', res.data);
    
    // 尝试手动解析
    try {
      JSON.parse(res.data);
      log('✗ JSON 不应该能解析成功\n', 'red');
    } catch (parseErr) {
      log('✓ JSON 解析失败 (符合预期)\n', 'green');
    }
  } catch (err) {
    log(`✗ 错误: ${err.message}\n`, 'red');
  }
}, 2000);

// 测试 4: 文件上传
setTimeout(async () => {
  log('━━━ 测试 4: /upload (文件上传) ━━━', 'cyan');
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', 'This is file content', { filename: 'test.txt' });
    formData.append('description', 'Test upload');
    
    const res = await client.post('/upload', formData, {
      headers: formData.getHeaders()
    });
    
    console.log('状态码:', res.status);
    console.log('文件数量:', res.data.filesReceived || 0);
    console.log('表单数据:', JSON.stringify(res.data.form || {}));
    
    if (res.status === 200 && res.data.filesReceived) {
      log('✓ 文件上传测试通过\n', 'green');
    } else {
      log('⚠️  文件上传可能需要完整的 multipart 支持\n', 'yellow');
    }
  } catch (err) {
    log(`✗ 错误: ${err.message}\n`, 'red');
  }
}, 3000);

// 测试 5: 超时测试 (hang)
setTimeout(async () => {
  log('━━━ 测试 5: /hang?duration=3 (超时测试) ━━━', 'cyan');
  const start = Date.now();
  try {
    const res = await client.get('/hang', {
      params: { duration: 3 },
      timeout: 5000 // 5秒超时
    });
    const elapsed = Date.now() - start;
    console.log('状态码:', res.status);
    console.log('等待时间:', elapsed, 'ms');
    console.log('响应:', JSON.stringify(res.data));
    if (elapsed >= 2900) {
      log('✓ Hang 端点正常工作\n', 'green');
    } else {
      log('✗ Hang 端点延迟不足\n', 'red');
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    if (err.code === 'ECONNABORTED') {
      log(`⚠️  请求超时 (${elapsed}ms) - 这是正常的超时测试\n`, 'yellow');
    } else {
      log(`✗ 错误: ${err.message}\n`, 'red');
    }
  }
}, 4000);

// 测试 6: 慢速字节流
setTimeout(async () => {
  log('━━━ 测试 6: /slow-bytes/1000?delay=50 (慢速传输) ━━━', 'cyan');
  const start = Date.now();
  try {
    const res = await client.get('/slow-bytes/1000', {
      params: { delay: 50 },
      responseType: 'arraybuffer',
      timeout: 15000
    });
    const elapsed = Date.now() - start;
    console.log('状态码:', res.status);
    console.log('接收字节数:', res.data.byteLength);
    console.log('耗时:', elapsed, 'ms');
    console.log('分块传输: 10个块 × 50ms = 预期 ~450ms');
    
    if (res.data.byteLength === 1000 && elapsed > 400) {
      log('✓ 慢速字节流测试通过\n', 'green');
    } else {
      log('⚠️  慢速字节流可能不符合预期\n', 'yellow');
    }
  } catch (err) {
    log(`✗ 错误: ${err.message}\n`, 'red');
  }
}, 10000);

// 测试总结
setTimeout(() => {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║          新功能测试完成                                ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');
  
  log('📝 新增端点列表:', 'yellow');
  log('  1. GET /empty - 空响应 (Content-Length: 0)', 'reset');
  log('  2. GET /no-content - 204 No Content', 'reset');
  log('  3. GET /malformed-json - 错误的 JSON (测试错误处理)', 'reset');
  log('  4. POST /upload - 文件上传详情', 'reset');
  log('  5. GET /hang?duration= - 延迟响应 (测试超时)', 'reset');
  log('  6. GET /slow-bytes/:n?delay= - 慢速字节流\n', 'reset');
  
  log('🎯 这些端点专门用于测试:', 'cyan');
  log('  ✓ Axios/Fetch 的边界情况处理', 'reset');
  log('  ✓ 超时和取消机制', 'reset');
  log('  ✓ 错误处理和恢复', 'reset');
  log('  ✓ 文件上传功能', 'reset');
  log('  ✓ 慢速网络模拟\n', 'reset');
}, 16000);
