/**
 * 验证 axios 修复的测试脚本
 * 测试重点:
 * 1. maxRedirects 支持
 * 2. request.path 属性
 * 3. 3xx 状态码不抛出错误
 * 4. 401 状态码正确抛出错误
 */

const axios = require('../../assets/axios.js');

const BASE_URL = 'https://httpbin.qingflow.dpdns.org';
const client = axios.create({ baseURL: BASE_URL });

let passedTests = 0;
let failedTests = 0;

function log(msg, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(colors[color] + msg + colors.reset);
}

async function test(name, fn) {
  try {
    await fn();
    log(`✓ ${name} - 通过`, 'green');
    passedTests++;
    return true;
  } catch (error) {
    log(`✗ ${name} - 失败: ${error.message}`, 'red');
    failedTests++;
    return false;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║       Axios 修复验证测试                                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // ============ 测试1: maxRedirects 支持 ============
  log('\n━━━ 测试: maxRedirects 支持 ━━━', 'blue');

  await test('maxRedirects: 0 应该返回 302 (不跟随重定向)', async () => {
    try {
      const res = await client.get('/redirect-to', {
        params: { url: `${BASE_URL}/get` },
        maxRedirects: 0
      });
      if (res.status !== 302) {
        throw new Error(`期望 302, 得到 ${res.status}`);
      }
      log(`  状态码: ${res.status}`, 'yellow');
    } catch (error) {
      log(`  错误详情: ${error.message}`, 'yellow');
      log(`  错误响应: ${error.response ? error.response.status : 'N/A'}`, 'yellow');
      throw error;
    }
  });

  await test('maxRedirects: 0 应该返回 307', async () => {
    const res = await client.get('/redirect-to', {
      params: { url: `${BASE_URL}/get`, status_code: 307 },
      maxRedirects: 0
    });
    if (res.status !== 307) {
      throw new Error(`期望 307, 得到 ${res.status}`);
    }
    log(`  状态码: ${res.status}`, 'yellow');
  });

  await test('maxRedirects: 5 应该自动跟随重定向', async () => {
    const res = await client.get('/redirect/3', { maxRedirects: 5 });
    if (!res.request.path.includes('/get')) {
      throw new Error('未正确重定向到 /get');
    }
    log(`  最终路径: ${res.request.path}`, 'yellow');
  });

  // ============ 测试2: request.path 属性 ============
  log('\n━━━ 测试: request.path 属性 ━━━', 'blue');

  await test('request.path 应该存在', async () => {
    const res = await client.get('/get');
    if (!res.request || !res.request.path) {
      throw new Error('request.path 不存在');
    }
    log(`  request.path: ${res.request.path}`, 'yellow');
  });

  await test('request.path 应该包含完整 URL', async () => {
    const res = await client.get('/anything/test');
    if (!res.request.path.includes('/anything/test')) {
      throw new Error('request.path 不包含路径');
    }
    log(`  request.path: ${res.request.path}`, 'yellow');
  });

  // ============ 测试3: 3xx 状态码不抛出错误 ============
  log('\n━━━ 测试: 3xx 状态码处理 ━━━', 'blue');

  await test('302 状态码不应该抛出错误', async () => {
    const res = await client.get('/redirect-to', {
      params: { url: `${BASE_URL}/get` },
      maxRedirects: 0
    });
    if (res.status !== 302) {
      throw new Error(`期望 302, 得到 ${res.status}`);
    }
    // 如果没有抛出错误，说明修复成功
  });

  await test('Location header 应该存在', async () => {
    const res = await client.get('/redirect-to', {
      params: { url: `${BASE_URL}/get` },
      maxRedirects: 0
    });
    const location = res.headers['location'];
    if (!location) {
      throw new Error('Location header 不存在');
    }
    if (!location.includes('/get')) {
      throw new Error('Location header 不正确');
    }
    log(`  Location: ${location}`, 'yellow');
  });

  // ============ 测试4: 401 状态码应该抛出错误 ============
  log('\n━━━ 测试: 4xx 状态码处理 ━━━', 'blue');

  await test('401 状态码应该抛出错误', async () => {
    try {
      await client.get('/basic-auth/testuser/testpass');
      throw new Error('应该抛出 401 错误');
    } catch (error) {
      if (!error.response || error.response.status !== 401) {
        throw new Error(`期望 401 错误, 得到: ${error.message}`);
      }
      log(`  正确抛出 401 错误`, 'yellow');
    }
  });

  await test('404 状态码应该抛出错误', async () => {
    try {
      await client.get('/status/404');
      throw new Error('应该抛出 404 错误');
    } catch (error) {
      if (!error.response || error.response.status !== 404) {
        throw new Error(`期望 404 错误, 得到: ${error.message}`);
      }
      log(`  正确抛出 404 错误`, 'yellow');
    }
  });

  // ============ 测试5: 图片重定向测试 ============
  log('\n━━━ 测试: 图片重定向 ━━━', 'blue');

  await test('GET /image (Accept: image/webp) 应该返回 Location', async () => {
    const res = await client.get('/image', {
      headers: { 'Accept': 'image/webp' },
      maxRedirects: 0
    });
    const location = res.headers['location'];
    if (!location) {
      throw new Error('Location header 不存在');
    }
    if (!location.includes('/image/webp')) {
      throw new Error(`Location 不正确: ${location}`);
    }
    log(`  Location: ${location}`, 'yellow');
  });

  // ============ 汇总结果 ============
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    测试结果汇总                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const total = passedTests + failedTests;
  const successRate = ((passedTests / total) * 100).toFixed(2);

  console.log(`总测试数: ${total}`);
  log(`✓ 通过: ${passedTests}`, 'green');
  if (failedTests > 0) {
    log(`✗ 失败: ${failedTests}`, 'red');
  }
  console.log(`📊 成功率: ${successRate}%\n`);

  if (failedTests === 0) {
    log('🎉 所有测试通过!', 'green');
  } else {
    log('⚠️  部分测试失败,请检查上述错误信息', 'yellow');
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\n❌ 测试运行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
