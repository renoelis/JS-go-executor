/**
 * Httpbin 测试脚本 - 使用 axios
 * 测试域名: https://httpbin.qingflow.dpdns.org
 * 
 * 安装依赖: npm install axios
 */

const axios = require('axios');

const BASE_URL = 'https://httpbin.qingflow.dpdns.org';

// 创建 axios 实例
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  validateStatus: () => true // 不自动抛出错误
});

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.cyan}━━━ 测试: ${name} ━━━${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

// 测试结果统计
let passed = 0;
let failed = 0;

async function test(name, testFn) {
  try {
    await testFn();
    passed++;
    logSuccess(`${name} - 通过`);
  } catch (error) {
    failed++;
    logError(`${name} - 失败: ${error.message}`);
  }
}

// ============ HTTP 方法测试 ============
async function testHttpMethods() {
  logTest('HTTP 方法测试');

  await test('GET /get', async () => {
    const res = await client.get('/get', { params: { foo: 'bar' } });
    if (!res.data.args.foo || res.data.args.foo !== 'bar') throw new Error('参数不匹配');
    if (res.data.method !== 'GET') throw new Error('方法不匹配');
  });

  await test('POST /post', async () => {
    const res = await client.post('/post', { test: 'data' });
    if (!res.data.json || res.data.json.test !== 'data') throw new Error('POST 数据不匹配');
  });

  await test('PUT /put', async () => {
    const res = await client.put('/put', { update: 'value' });
    if (res.data.method !== 'PUT') throw new Error('方法不匹配');
  });

  await test('PATCH /patch', async () => {
    const res = await client.patch('/patch', { patch: 'data' });
    if (res.data.method !== 'PATCH') throw new Error('方法不匹配');
  });

  await test('DELETE /delete', async () => {
    const res = await client.delete('/delete');
    if (res.data.method !== 'DELETE') throw new Error('方法不匹配');
  });

  await test('POST /anything', async () => {
    const res = await client.post('/anything/test/path', 'test');
    if (!res.data.url.includes('/anything/test/path')) throw new Error('路径不匹配');
  });
}

// ============ 请求检查测试 ============
async function testRequestInspection() {
  logTest('请求检查测试');

  await test('GET /ip', async () => {
    const res = await client.get('/ip');
    if (!res.data.origin) throw new Error('未返回 IP');
    log(`  IP: ${res.data.origin}`, 'yellow');
  });

  await test('GET /user-agent', async () => {
    const res = await client.get('/user-agent');
    if (!res.data['user-agent']) throw new Error('未返回 User-Agent');
  });

  await test('GET /headers', async () => {
    const res = await client.get('/headers', {
      headers: { 'X-Custom-Header': 'test-value' }
    });
    if (!res.data.headers) throw new Error('未返回 headers');
  });

  await test('GET /uuid', async () => {
    const res = await client.get('/uuid');
    if (!res.data.uuid || !/^[0-9a-f-]{36}$/.test(res.data.uuid)) throw new Error('UUID 格式错误');
    log(`  UUID: ${res.data.uuid}`, 'yellow');
  });
}

// ============ Cookie 测试 ============
async function testCookies() {
  logTest('Cookie 测试');

  await test('GET /cookies/set', async () => {
    const res = await client.get('/cookies/set', {
      params: { name: 'value', foo: 'bar' }
    });
    if (!res.data.cookies.name || res.data.cookies.name !== 'value') throw new Error('Cookie 未设置');
  });

  await test('GET /cookies/set/:name/:value', async () => {
    const res = await client.get('/cookies/set/test/123');
    if (!res.data.cookies.test || res.data.cookies.test !== '123') throw new Error('Cookie 未设置');
  });

  await test('GET /cookies', async () => {
    const res = await client.get('/cookies', {
      headers: { 'Cookie': 'test=value; foo=bar' }
    });
    if (!res.data.cookies) throw new Error('未返回 cookies');
  });
}

// ============ 认证测试 ============
async function testAuth() {
  logTest('认证测试');

  await test('GET /basic-auth/:user/:pass (成功)', async () => {
    const res = await client.get('/basic-auth/testuser/testpass', {
      auth: { username: 'testuser', password: 'testpass' }
    });
    if (!res.data.authenticated) throw new Error('认证失败');
  });

  await test('GET /basic-auth/:user/:pass (失败)', async () => {
    const res = await client.get('/basic-auth/testuser/testpass');
    if (res.status !== 401) throw new Error('应该返回 401');
  });

  await test('GET /bearer', async () => {
    const res = await client.get('/bearer', {
      headers: { 'Authorization': 'Bearer my-token-123' }
    });
    if (!res.data.authenticated || res.data.token !== 'my-token-123') throw new Error('Bearer 认证失败');
  });

  await test('GET /hidden-basic-auth/:user/:pass', async () => {
    const res = await client.get('/hidden-basic-auth/user/pass', {
      auth: { username: 'user', password: 'pass' }
    });
    if (!res.data.authenticated) throw new Error('隐藏认证失败');
  });
}

// ============ 状态码测试 ============
async function testStatusCodes() {
  logTest('状态码测试');

  await test('GET /status/200', async () => {
    const res = await client.get('/status/200');
    if (res.status !== 200) throw new Error(`期望 200, 得到 ${res.status}`);
  });

  await test('GET /status/404', async () => {
    const res = await client.get('/status/404');
    if (res.status !== 404) throw new Error(`期望 404, 得到 ${res.status}`);
  });

  await test('GET /status/500', async () => {
    const res = await client.get('/status/500');
    if (res.status !== 500) throw new Error(`期望 500, 得到 ${res.status}`);
  });

  await test('GET /status/418 (I\'m a teapot)', async () => {
    const res = await client.get('/status/418');
    if (res.status !== 418) throw new Error(`期望 418, 得到 ${res.status}`);
  });
}

// ============ 重定向测试 ============
async function testRedirects() {
  logTest('重定向测试');

  await test('GET /redirect/3', async () => {
    const res = await client.get('/redirect/3', { maxRedirects: 5 });
    if (!res.request.path.includes('/get')) throw new Error('未正确重定向到 /get');
  });

  await test('GET /redirect-to?url=...', async () => {
    const res = await client.get('/redirect-to', {
      params: { url: `${BASE_URL}/get` },
      maxRedirects: 0
    });
    if (res.status !== 302) throw new Error('应该返回 302');
  });

  await test('GET /redirect-to?url=...&status_code=307', async () => {
    const res = await client.get('/redirect-to', {
      params: { url: `${BASE_URL}/get`, status_code: 307 },
      maxRedirects: 0
    });
    if (res.status !== 307) throw new Error('应该返回 307');
  });

  await test('GET /relative-redirect/2', async () => {
    const res = await client.get('/relative-redirect/2', { maxRedirects: 5 });
    if (!res.request.path.includes('/get')) throw new Error('未正确重定向');
  });

  await test('GET /absolute-redirect/2', async () => {
    const res = await client.get('/absolute-redirect/2', { maxRedirects: 5 });
    if (!res.request.path.includes('/get')) throw new Error('未正确重定向');
  });
}

// ============ 响应格式测试 ============
async function testResponseFormats() {
  logTest('响应格式测试');

  await test('GET /json', async () => {
    const res = await client.get('/json');
    if (!res.data.slideshow) throw new Error('JSON 格式错误');
  });

  await test('GET /html', async () => {
    const res = await client.get('/html');
    if (!res.data.includes('<html>')) throw new Error('HTML 格式错误');
  });

  await test('GET /xml', async () => {
    const res = await client.get('/xml');
    if (!res.data.includes('<?xml')) throw new Error('XML 格式错误');
  });

  await test('GET /encoding/utf8', async () => {
    const res = await client.get('/encoding/utf8');
    if (!res.data.includes('漢字') || !res.data.includes('😀')) throw new Error('UTF-8 编码错误');
  });

  await test('GET /robots.txt', async () => {
    const res = await client.get('/robots.txt');
    if (!res.data.includes('User-agent')) throw new Error('robots.txt 格式错误');
  });

  await test('GET /deny', async () => {
    const res = await client.get('/deny');
    if (res.status !== 403) throw new Error('应该返回 403');
  });
}

// ============ 压缩测试 ============
async function testCompression() {
  logTest('压缩测试');

  await test('GET /gzip', async () => {
    const res = await client.get('/gzip');
    if (!res.data.gzipped) throw new Error('gzip 响应错误');
  });

  await test('GET /deflate', async () => {
    const res = await client.get('/deflate');
    if (!res.data.deflated) throw new Error('deflate 响应错误');
  });

  await test('GET /brotli', async () => {
    const res = await client.get('/brotli');
    if (!res.data.brotli && res.status !== 501) throw new Error('brotli 响应错误');
  });
}

// ============ 流式传输测试 ============
async function testStreaming() {
  logTest('流式传输测试');

  await test('GET /stream/5', async () => {
    const res = await client.get('/stream/5');
    const lines = res.data.trim().split('\n');
    if (lines.length !== 5) throw new Error(`期望 5 行, 得到 ${lines.length} 行`);
  });

  await test('GET /stream-bytes/1024', async () => {
    const res = await client.get('/stream-bytes/1024', { responseType: 'arraybuffer' });
    if (res.data.byteLength !== 1024) throw new Error(`期望 1024 字节, 得到 ${res.data.byteLength} 字节`);
  });

  await test('GET /bytes/512', async () => {
    const res = await client.get('/bytes/512', { responseType: 'arraybuffer' });
    if (res.data.byteLength !== 512) throw new Error(`期望 512 字节, 得到 ${res.data.byteLength} 字节`);
  });
}

// ============ 延迟测试 ============
async function testDelay() {
  logTest('延迟测试');

  await test('GET /delay/2', async () => {
    const start = Date.now();
    const res = await client.get('/delay/2');
    const elapsed = Date.now() - start;
    if (elapsed < 1900) throw new Error(`延迟不足 2 秒: ${elapsed}ms`);
    log(`  实际延迟: ${elapsed}ms`, 'yellow');
  });

  await test('GET /drip', async () => {
    const res = await client.get('/drip', {
      params: { numbytes: 10, duration: 1, code: 200 }
    });
    if (res.status !== 200) throw new Error('drip 响应错误');
  });
}

// ============ 缓存测试 ============
async function testCache() {
  logTest('缓存测试');

  await test('GET /cache', async () => {
    const res = await client.get('/cache');
    if (!res.headers['cache-control']) throw new Error('缺少 Cache-Control 头');
  });

  await test('GET /cache (带 If-None-Match)', async () => {
    const res = await client.get('/cache', {
      headers: { 'If-None-Match': '"test-etag"' }
    });
    if (res.status !== 304) throw new Error('应该返回 304');
  });

  await test('GET /cache/60', async () => {
    const res = await client.get('/cache/60');
    const cacheControl = res.headers['cache-control'];
    if (!cacheControl.includes('max-age=60')) throw new Error('Cache-Control 设置错误');
  });

  await test('GET /etag/test-tag', async () => {
    const res = await client.get('/etag/test-tag');
    const etag = res.headers['etag'];
    if (!etag || !etag.includes('test-tag')) throw new Error('ETag 错误');
  });

  await test('GET /etag/test-tag (带 If-None-Match)', async () => {
    const res = await client.get('/etag/test-tag', {
      headers: { 'If-None-Match': '"test-tag"' }
    });
    if (res.status !== 304) throw new Error('应该返回 304');
  });
}

// ============ 图片测试 ============
async function testImages() {
  logTest('图片测试');

  await test('GET /image/png', async () => {
    const res = await client.get('/image/png', { responseType: 'arraybuffer' });
    if (!res.headers['content-type'].includes('image/png')) throw new Error('PNG 类型错误');
  });

  await test('GET /image/jpeg', async () => {
    const res = await client.get('/image/jpeg', { responseType: 'arraybuffer' });
    if (!res.headers['content-type'].includes('image/jpeg')) throw new Error('JPEG 类型错误');
  });

  await test('GET /image/jpg', async () => {
    const res = await client.get('/image/jpg', { responseType: 'arraybuffer' });
    if (!res.headers['content-type'].includes('image/jpeg')) throw new Error('JPG 类型错误');
  });

  await test('GET /image/webp', async () => {
    const res = await client.get('/image/webp', { responseType: 'arraybuffer' });
    if (!res.headers['content-type'].includes('image/webp')) throw new Error('WebP 类型错误');
  });

  await test('GET /image/svg', async () => {
    const res = await client.get('/image/svg');
    if (!res.headers['content-type'].includes('image/svg')) throw new Error('SVG 类型错误');
  });

  await test('GET /image (Accept: image/webp)', async () => {
    const res = await client.get('/image', {
      headers: { 'Accept': 'image/webp' },
      maxRedirects: 0
    });
    const location = res.headers['location'];
    if (!location.includes('/image/webp')) throw new Error('Accept 协商失败');
  });
}

// ============ 其他功能测试 ============
async function testMisc() {
  logTest('其他功能测试');

  await test('GET /base64/:value', async () => {
    const encoded = Buffer.from('hello world').toString('base64');
    const res = await client.get(`/base64/${encoded}`);
    if (res.data !== 'hello world') throw new Error('Base64 解码错误');
  });

  await test('GET /response-headers', async () => {
    const res = await client.get('/response-headers', {
      params: { 'X-Custom': 'test', 'X-Another': 'value' }
    });
    if (res.headers['x-custom'] !== 'test') throw new Error('自定义响应头错误');
  });

  await test('GET /links/5', async () => {
    const res = await client.get('/links/5');
    if (!res.data.includes('<a href')) throw new Error('链接页面错误');
  });

  await test('GET /range/1024', async () => {
    const res = await client.get('/range/1024', {
      headers: { 'Range': 'bytes=0-99' },
      responseType: 'arraybuffer'
    });
    if (res.status !== 206) throw new Error('Range 请求应该返回 206');
    if (res.data.byteLength !== 100) throw new Error('Range 字节数错误');
  });
}

// ============ 性能测试 ============
async function testPerformance() {
  logTest('性能测试');

  await test('并发 10 个请求', async () => {
    const start = Date.now();
    const promises = Array(10).fill(null).map(() => client.get('/get'));
    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;
    
    if (results.some(r => r.status !== 200)) throw new Error('部分请求失败');
    log(`  10 个并发请求耗时: ${elapsed}ms`, 'yellow');
  });

  await test('大数据传输 (50KB)', async () => {
    const start = Date.now();
    const res = await client.get('/bytes/51200', { responseType: 'arraybuffer' });
    const elapsed = Date.now() - start;
    
    if (res.data.byteLength !== 51200) throw new Error('数据大小不匹配');
    log(`  50KB 数据传输耗时: ${elapsed}ms`, 'yellow');
  });
}

// ============ 新功能测试 (边界情况) ============
async function testEdgeCases() {
  logTest('边界情况测试');

  await test('GET /empty (空响应)', async () => {
    const res = await client.get('/empty');
    if (res.status !== 200) throw new Error(`状态码错误: ${res.status}`);
    log(`  实际返回: ${JSON.stringify(res.data)}, 类型: ${typeof res.data}`, 'yellow');
    // 空响应可能被解析为 null 或空字符串
    if (res.data !== '' && res.data !== null) throw new Error(`响应应该为空，实际: ${JSON.stringify(res.data)}`);
  });

  await test('GET /no-content (204)', async () => {
    const res = await client.get('/no-content');
    if (res.status !== 204) throw new Error(`应该返回 204, 得到 ${res.status}`);
  });

  await test('GET /malformed-json (错误 JSON)', async () => {
    const res = await client.get('/malformed-json', {
      transformResponse: [(data) => data]
    });
    if (res.status !== 200) throw new Error('状态码错误');
    try {
      JSON.parse(res.data);
      throw new Error('JSON 不应该能解析成功');
    } catch (e) {
      if (e.message === 'JSON 不应该能解析成功') throw e;
      // JSON 解析失败是预期的
    }
  });

  await test('POST /upload (文件上传)', async () => {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('description', 'Test file');
    formData.append('file', Buffer.from('Test file content'), {
      filename: 'test.txt',
      contentType: 'text/plain'
    });
    
    const res = await client.post('/upload', formData, {
      headers: formData.getHeaders()
    });
    if (res.status !== 200) throw new Error('上传失败');
    if (!res.data.form || res.data.form.description !== 'Test file') throw new Error('表单数据不匹配');
    if (!res.data.files || !res.data.files.file) throw new Error('文件未接收');
  });
}

// ============ 超时和慢速测试 ============
async function testTimeoutAndSlow() {
  logTest('超时和慢速传输测试');

  await test('GET /hang?duration=3 (延迟响应)', async () => {
    const start = Date.now();
    const res = await client.get('/hang', {
      params: { duration: 3 },
      timeout: 5000
    });
    const elapsed = Date.now() - start;
    if (res.status !== 200) throw new Error('状态码错误');
    if (elapsed < 2900) throw new Error(`延迟不足: ${elapsed}ms`);
    log(`  实际延迟: ${elapsed}ms`, 'yellow');
  });

  await test('GET /hang?duration=10 (超时测试)', async () => {
    const start = Date.now();
    try {
      await client.get('/hang', {
        params: { duration: 10 },
        timeout: 2000
      });
      throw new Error('应该超时但没有');
    } catch (err) {
      const elapsed = Date.now() - start;
      if (err.code !== 'ECONNABORTED') throw new Error('应该是超时错误');
      if (elapsed > 2500) throw new Error(`超时时间过长: ${elapsed}ms`);
      log(`  超时时间: ${elapsed}ms`, 'yellow');
    }
  });

  await test('GET /slow-bytes/1000?delay=10 (慢速传输)', async () => {
    const start = Date.now();
    const res = await client.get('/slow-bytes/1000', {
      params: { delay: 10 },
      responseType: 'arraybuffer',
      timeout: 30000
    });
    const elapsed = Date.now() - start;
    if (res.status !== 200) throw new Error('状态码错误');
    if (res.data.byteLength !== 1000) throw new Error(`字节数不匹配: ${res.data.byteLength}`);
    log(`  慢速传输耗时: ${elapsed}ms`, 'yellow');
  });
}

// ============ 主测试函数 ============
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║       Httpbin 完整功能测试 (Axios 版本)                ║', 'cyan');
  log('║       测试域名: https://httpbin.qingflow.dpdns.org     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  const startTime = Date.now();

  await testHttpMethods();
  await testRequestInspection();
  await testCookies();
  await testAuth();
  await testStatusCodes();
  await testRedirects();
  await testResponseFormats();
  await testCompression();
  await testStreaming();
  await testDelay();
  await testCache();
  await testImages();
  await testMisc();
  await testPerformance();
  await testEdgeCases();
  await testTimeoutAndSlow();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // 输出测试结果
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    测试结果汇总                         ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');
  log(`\n总测试数: ${passed + failed}`, 'blue');
  log(`✓ 通过: ${passed}`, 'green');
  log(`✗ 失败: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`⏱  耗时: ${duration}s`, 'yellow');
  log(`📊 成功率: ${((passed / (passed + failed)) * 100).toFixed(2)}%\n`, 'cyan');

  if (failed === 0) {
    log('🎉 所有测试通过!', 'green');
  } else {
    log('⚠️  部分测试失败,请检查上述错误信息', 'yellow');
  }
}

// 运行测试
runAllTests().catch(error => {
  logError(`测试运行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
