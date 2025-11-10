/**
 * Httpbin 测试脚本 - 使用原生 fetch API
 * 测试域名: https://httpbin.qingflow.dpdns.org
 */

const BASE_URL = 'https://httpbin.qingflow.dpdns.org';

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
    const res = await fetch(`${BASE_URL}/get?foo=bar`);
    const data = await res.json();
    if (!data.args.foo || data.args.foo !== 'bar') throw new Error('参数不匹配');
    if (data.method !== 'GET') throw new Error('方法不匹配');
  });

  await test('POST /post', async () => {
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    const data = await res.json();
    if (!data.json || data.json.test !== 'data') throw new Error('POST 数据不匹配');
  });

  await test('PUT /put', async () => {
    const res = await fetch(`${BASE_URL}/put`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update: 'value' })
    });
    const data = await res.json();
    if (data.method !== 'PUT') throw new Error('方法不匹配');
  });

  await test('PATCH /patch', async () => {
    const res = await fetch(`${BASE_URL}/patch`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patch: 'data' })
    });
    const data = await res.json();
    if (data.method !== 'PATCH') throw new Error('方法不匹配');
  });

  await test('DELETE /delete', async () => {
    const res = await fetch(`${BASE_URL}/delete`, { method: 'DELETE' });
    const data = await res.json();
    if (data.method !== 'DELETE') throw new Error('方法不匹配');
  });

  await test('POST /anything', async () => {
    const res = await fetch(`${BASE_URL}/anything/test/path`, {
      method: 'POST',
      body: 'test'
    });
    const data = await res.json();
    if (!data.url.includes('/anything/test/path')) throw new Error('路径不匹配');
  });
}

// ============ 请求检查测试 ============
async function testRequestInspection() {
  logTest('请求检查测试');

  await test('GET /ip', async () => {
    const res = await fetch(`${BASE_URL}/ip`);
    const data = await res.json();
    if (!data.origin) throw new Error('未返回 IP');
    log(`  IP: ${data.origin}`, 'yellow');
  });

  await test('GET /user-agent', async () => {
    const res = await fetch(`${BASE_URL}/user-agent`);
    const data = await res.json();
    if (!data['user-agent']) throw new Error('未返回 User-Agent');
  });

  await test('GET /headers', async () => {
    const res = await fetch(`${BASE_URL}/headers`, {
      headers: { 'X-Custom-Header': 'test-value' }
    });
    const data = await res.json();
    if (!data.headers) throw new Error('未返回 headers');
  });

  await test('GET /uuid', async () => {
    const res = await fetch(`${BASE_URL}/uuid`);
    const data = await res.json();
    if (!data.uuid || !/^[0-9a-f-]{36}$/.test(data.uuid)) throw new Error('UUID 格式错误');
    log(`  UUID: ${data.uuid}`, 'yellow');
  });
}

// ============ Cookie 测试 ============
async function testCookies() {
  logTest('Cookie 测试');

  await test('GET /cookies/set', async () => {
    const res = await fetch(`${BASE_URL}/cookies/set?name=value&foo=bar`);
    const data = await res.json();
    if (!data.cookies.name || data.cookies.name !== 'value') throw new Error('Cookie 未设置');
  });

  await test('GET /cookies/set/:name/:value', async () => {
    const res = await fetch(`${BASE_URL}/cookies/set/test/123`);
    const data = await res.json();
    if (!data.cookies.test || data.cookies.test !== '123') throw new Error('Cookie 未设置');
  });

  await test('GET /cookies', async () => {
    const res = await fetch(`${BASE_URL}/cookies`, {
      headers: { 'Cookie': 'test=value; foo=bar' }
    });
    const data = await res.json();
    if (!data.cookies) throw new Error('未返回 cookies');
  });
}

// ============ 认证测试 ============
async function testAuth() {
  logTest('认证测试');

  await test('GET /basic-auth/:user/:pass (成功)', async () => {
    const res = await fetch(`${BASE_URL}/basic-auth/testuser/testpass`, {
      headers: {
        'Authorization': 'Basic ' + btoa('testuser:testpass')
      }
    });
    const data = await res.json();
    if (!data.authenticated) throw new Error('认证失败');
  });

  await test('GET /basic-auth/:user/:pass (失败)', async () => {
    const res = await fetch(`${BASE_URL}/basic-auth/testuser/testpass`);
    if (res.status !== 401) throw new Error('应该返回 401');
  });

  await test('GET /bearer', async () => {
    const res = await fetch(`${BASE_URL}/bearer`, {
      headers: { 'Authorization': 'Bearer my-token-123' }
    });
    const data = await res.json();
    if (!data.authenticated || data.token !== 'my-token-123') throw new Error('Bearer 认证失败');
  });

  await test('GET /hidden-basic-auth/:user/:pass', async () => {
    const res = await fetch(`${BASE_URL}/hidden-basic-auth/user/pass`, {
      headers: { 'Authorization': 'Basic ' + btoa('user:pass') }
    });
    const data = await res.json();
    if (!data.authenticated) throw new Error('隐藏认证失败');
  });
}

// ============ 状态码测试 ============
async function testStatusCodes() {
  logTest('状态码测试');

  await test('GET /status/200', async () => {
    const res = await fetch(`${BASE_URL}/status/200`);
    if (res.status !== 200) throw new Error(`期望 200, 得到 ${res.status}`);
    await res.text(); // 消费 body
  });

  await test('GET /status/404', async () => {
    const res = await fetch(`${BASE_URL}/status/404`);
    if (res.status !== 404) throw new Error(`期望 404, 得到 ${res.status}`);
    await res.text(); // 消费 body
  });

  await test('GET /status/500', async () => {
    const res = await fetch(`${BASE_URL}/status/500`);
    if (res.status !== 500) throw new Error(`期望 500, 得到 ${res.status}`);
    await res.text(); // 消费 body
  });

  await test('GET /status/418 (I\'m a teapot)', async () => {
    const res = await fetch(`${BASE_URL}/status/418`);
    if (res.status !== 418) throw new Error(`期望 418, 得到 ${res.status}`);
    await res.text(); // 消费 body
  });
}

// ============ 重定向测试 ============
async function testRedirects() {
  logTest('重定向测试');

  await test('GET /redirect/3', async () => {
    const res = await fetch(`${BASE_URL}/redirect/3`, { redirect: 'follow' });
    if (!res.url.includes('/get')) throw new Error('未正确重定向到 /get');
    await res.json(); // 消费 body
  });

  await test('GET /redirect-to?url=...', async () => {
    const res = await fetch(`${BASE_URL}/redirect-to?url=${encodeURIComponent(BASE_URL + '/get')}`, {
      redirect: 'manual'
    });
    if (res.status !== 302) throw new Error('应该返回 302');
    await res.text(); // 消费 body
  });

  await test('GET /redirect-to?url=...&status_code=307', async () => {
    const res = await fetch(`${BASE_URL}/redirect-to?url=${encodeURIComponent(BASE_URL + '/get')}&status_code=307`, {
      redirect: 'manual'
    });
    if (res.status !== 307) throw new Error('应该返回 307');
    await res.text(); // 消费 body
  });

  await test('GET /relative-redirect/2', async () => {
    const res = await fetch(`${BASE_URL}/relative-redirect/2`, { redirect: 'follow' });
    if (!res.url.includes('/get')) throw new Error('未正确重定向');
    await res.json(); // 消费 body
  });

  await test('GET /absolute-redirect/2', async () => {
    const res = await fetch(`${BASE_URL}/absolute-redirect/2`, { redirect: 'follow' });
    if (!res.url.includes('/get')) throw new Error('未正确重定向');
    await res.json(); // 消费 body
  });
}

// ============ 响应格式测试 ============
async function testResponseFormats() {
  logTest('响应格式测试');

  await test('GET /json', async () => {
    const res = await fetch(`${BASE_URL}/json`);
    const data = await res.json();
    if (!data.slideshow) throw new Error('JSON 格式错误');
  });

  await test('GET /html', async () => {
    const res = await fetch(`${BASE_URL}/html`);
    const text = await res.text();
    if (!text.includes('<html>')) throw new Error('HTML 格式错误');
  });

  await test('GET /xml', async () => {
    const res = await fetch(`${BASE_URL}/xml`);
    const text = await res.text();
    if (!text.includes('<?xml')) throw new Error('XML 格式错误');
  });

  await test('GET /encoding/utf8', async () => {
    const res = await fetch(`${BASE_URL}/encoding/utf8`);
    const text = await res.text();
    if (!text.includes('漢字') || !text.includes('😀')) throw new Error('UTF-8 编码错误');
  });

  await test('GET /robots.txt', async () => {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    const text = await res.text();
    if (!text.includes('User-agent')) throw new Error('robots.txt 格式错误');
  });

  await test('GET /deny', async () => {
    const res = await fetch(`${BASE_URL}/deny`);
     const text = await res.text();
    if (res.status !== 403) throw new Error('应该返回 403');
  });
}

// ============ 压缩测试 ============
async function testCompression() {
  logTest('压缩测试');

  await test('GET /gzip', async () => {
    const res = await fetch(`${BASE_URL}/gzip`);
    const data = await res.json();
    if (!data.gzipped) throw new Error('gzip 响应错误');
  });

  await test('GET /deflate', async () => {
    const res = await fetch(`${BASE_URL}/deflate`);
    const data = await res.json();
    if (!data.deflated) throw new Error('deflate 响应错误');
  });

  await test('GET /brotli', async () => {
    const res = await fetch(`${BASE_URL}/brotli`);
    const data = await res.json();
    if (!data.brotli && res.status !== 501) throw new Error('brotli 响应错误');
  });
}

// ============ 流式传输测试 ============
async function testStreaming() {
  logTest('流式传输测试');

  await test('GET /stream/5', async () => {
    const res = await fetch(`${BASE_URL}/stream/5`);
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length !== 5) throw new Error(`期望 5 行, 得到 ${lines.length} 行`);
  });

  await test('GET /stream-bytes/1024', async () => {
    const res = await fetch(`${BASE_URL}/stream-bytes/1024`);
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength !== 1024) throw new Error(`期望 1024 字节, 得到 ${buffer.byteLength} 字节`);
  });

  await test('GET /bytes/512', async () => {
    const res = await fetch(`${BASE_URL}/bytes/512`);
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength !== 512) throw new Error(`期望 512 字节, 得到 ${buffer.byteLength} 字节`);
  });
}

// ============ 延迟测试 ============
async function testDelay() {
  logTest('延迟测试');

  await test('GET /delay/2', async () => {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/delay/2`);
    const elapsed = Date.now() - start;
    if (elapsed < 1900) throw new Error(`延迟不足 2 秒: ${elapsed}ms`);
    const data = await res.json();
    log(`  实际延迟: ${elapsed}ms`, 'yellow');
  });

  await test('GET /drip', async () => {
    const res = await fetch(`${BASE_URL}/drip?numbytes=10&duration=1&code=200`);
    if (res.status !== 200) throw new Error('drip 响应错误');
    await res.arrayBuffer(); // 消费 body
  });
}

// ============ 缓存测试 ============
async function testCache() {
  logTest('缓存测试');

  await test('GET /cache', async () => {
    const res = await fetch(`${BASE_URL}/cache`);
    const data = await res.json();
    if (!res.headers.get('Cache-Control')) throw new Error('缺少 Cache-Control 头');
  });

  await test('GET /cache (带 If-None-Match)', async () => {
    const res = await fetch(`${BASE_URL}/cache`, {
      headers: { 'If-None-Match': '"test-etag"' }
    });
    if (res.status !== 304) throw new Error('应该返回 304');
    await res.text(); // 消费 body
  });

  await test('GET /cache/60', async () => {
    const res = await fetch(`${BASE_URL}/cache/60`);
    const cacheControl = res.headers.get('Cache-Control');
    if (!cacheControl.includes('max-age=60')) throw new Error('Cache-Control 设置错误');
    await res.json(); // 消费 body
  });

  await test('GET /etag/test-tag', async () => {
    const res = await fetch(`${BASE_URL}/etag/test-tag`);
    const etag = res.headers.get('ETag');
    if (!etag || !etag.includes('test-tag')) throw new Error('ETag 错误');
    await res.json(); // 消费 body
  });

  await test('GET /etag/test-tag (带 If-None-Match)', async () => {
    const res = await fetch(`${BASE_URL}/etag/test-tag`, {
      headers: { 'If-None-Match': '"test-tag"' }
    });
    if (res.status !== 304) throw new Error('应该返回 304');
    await res.text(); // 消费 body
  });
}

// ============ 图片测试 ============
async function testImages() {
  logTest('图片测试');

  await test('GET /image/png', async () => {
    const res = await fetch(`${BASE_URL}/image/png`);
    if (!res.headers.get('Content-Type').includes('image/png')) throw new Error('PNG 类型错误');
    await res.arrayBuffer(); // 消费 body
  });

  await test('GET /image/jpeg', async () => {
    const res = await fetch(`${BASE_URL}/image/jpeg`);
    if (!res.headers.get('Content-Type').includes('image/jpeg')) throw new Error('JPEG 类型错误');
    await res.arrayBuffer(); // 消费 body
  });

  await test('GET /image/jpg', async () => {
    const res = await fetch(`${BASE_URL}/image/jpg`);
    if (!res.headers.get('Content-Type').includes('image/jpeg')) throw new Error('JPG 类型错误');
    await res.arrayBuffer(); // 消费 body
  });

  await test('GET /image/webp', async () => {
    const res = await fetch(`${BASE_URL}/image/webp`);
    if (!res.headers.get('Content-Type').includes('image/webp')) throw new Error('WebP 类型错误');
    await res.arrayBuffer(); // 消费 body
  });

  await test('GET /image/svg', async () => {
    const res = await fetch(`${BASE_URL}/image/svg`);
    if (!res.headers.get('Content-Type').includes('image/svg')) throw new Error('SVG 类型错误');
    await res.arrayBuffer(); // 消费 body
  });

  await test('GET /image (Accept: image/webp)', async () => {
    const res = await fetch(`${BASE_URL}/image`, {
      headers: { 'Accept': 'image/webp' },
      redirect: 'manual'
    });
    const location = res.headers.get('Location');
    if (!location.includes('/image/webp')) throw new Error('Accept 协商失败');
    await res.text(); // 消费 body
  });
}

// ============ 其他功能测试 ============
async function testMisc() {
  logTest('其他功能测试');

  await test('GET /base64/:value', async () => {
    const encoded = btoa('hello world');
    const res = await fetch(`${BASE_URL}/base64/${encoded}`);
    const text = await res.text();
    if (text !== 'hello world') throw new Error('Base64 解码错误');
  });

  await test('GET /response-headers', async () => {
    const res = await fetch(`${BASE_URL}/response-headers?X-Custom=test&X-Another=value`);
    if (res.headers.get('X-Custom') !== 'test') throw new Error('自定义响应头错误');
    await res.json(); // 消费 body
  });

  await test('GET /links/5', async () => {
    const res = await fetch(`${BASE_URL}/links/5`);
    const text = await res.text();
    if (!text.includes('<a href')) throw new Error('链接页面错误');
  });

  await test('GET /range/1024', async () => {
    const res = await fetch(`${BASE_URL}/range/1024`, {
      headers: { 'Range': 'bytes=0-99' }
    });
    if (res.status !== 206) throw new Error('Range 请求应该返回 206');
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength !== 100) throw new Error('Range 字节数错误');
  });
}

// ============ 边界情况测试 ============
async function testEdgeCases() {
  logTest('边界情况测试');

  await test('GET /empty (空响应)', async () => {
    const res = await fetch(`${BASE_URL}/empty`);
    if (res.status !== 200) throw new Error(`状态码错误: ${res.status}`);
    const text = await res.text();
    if (text !== '') throw new Error('响应应该为空');
  });

  await test('GET /no-content (204)', async () => {
    const res = await fetch(`${BASE_URL}/no-content`);
    if (res.status !== 204) throw new Error(`应该返回 204, 得到 ${res.status}`);
    await res.text(); // 消费 body（即使是空的）
  });

  await test('GET /malformed-json (错误 JSON)', async () => {
    const res = await fetch(`${BASE_URL}/malformed-json`);
    if (res.status !== 200) throw new Error('状态码错误');
    const text = await res.text();
    try {
      JSON.parse(text);
      throw new Error('JSON 不应该能解析成功');
    } catch (e) {
      if (e.message === 'JSON 不应该能解析成功') throw e;
      // JSON 解析失败是预期的
    }
  });

  await test('POST /upload (文件上传)', async () => {
    const formData = new FormData();
    formData.append('description', 'Test file');
    formData.append('file', new Blob(['Test file content'], { type: 'text/plain' }), 'test.txt');
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    if (res.status !== 200) throw new Error('上传失败');
    const data = await res.json();
    if (!data.form || data.form.description !== 'Test file') throw new Error('表单数据不匹配');
    if (!data.files || !data.files.file) throw new Error('文件未接收');
  });
}

// ============ 超时和慢速测试 ============
async function testTimeoutAndSlow() {
  logTest('超时和慢速传输测试');

  await test('GET /hang?duration=3 (延迟响应)', async () => {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/hang?duration=3`);
    if (res.status !== 200) throw new Error('状态码错误');
    const data = await res.json(); // ✅ 先读取 body
    const elapsed = Date.now() - start; // ✅ 然后测量总时间
    if (elapsed < 2900) throw new Error(`延迟不足: ${elapsed}ms`);
    log(`  实际延迟: ${elapsed}ms`, 'yellow');
  });

  await test('GET /hang?duration=10 (超时测试)', async () => {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    try {
      await fetch(`${BASE_URL}/hang?duration=10`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      throw new Error('应该超时但没有');
    } catch (err) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - start;
      if (err.name !== 'AbortError') throw new Error(`应该是 AbortError, 得到 ${err.name}`);
      if (elapsed > 2500) throw new Error(`超时时间过长: ${elapsed}ms`);
      log(`  超时时间: ${elapsed}ms`, 'yellow');
    }
  });

  await test('GET /slow-bytes/1000?delay=10 (慢速传输)', async () => {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/slow-bytes/1000?delay=10`);
    if (res.status !== 200) throw new Error('状态码错误');
    const buffer = await res.arrayBuffer(); // ✅ 先读取完整 body
    const elapsed = Date.now() - start; // ✅ 然后测量总时间
    if (buffer.byteLength !== 1000) throw new Error(`字节数不匹配: ${buffer.byteLength}`);
    log(`  慢速传输耗时: ${elapsed}ms`, 'yellow');
  });
}

// ============ 主测试函数 ============
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║       Httpbin 完整功能测试                              ║', 'cyan');
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
