/**
 * 测试 axios 获取多个 Set-Cookie 的能力
 * 
 * 问题背景：
 * - 服务器返回多个 Set-Cookie header
 * - 底层 fetch 的 headers.forEach 只返回第一个值
 * - 导致 axios 只能获取到一个 cookie
 * 
 * 修复方案：
 * 1. fetch_enhancement.go: headers.forEach 和 headers.get 对 Set-Cookie 返回数组
 * 2. axios.js: parseHeaders 正确处理数组类型的 header 值
 */

const axios = require('axios');

async function testSetCookie() {
  console.log('=== 测试 axios 获取多个 Set-Cookie ===\n');

  try {
    const url = 'https://cookies.qingflow.dpdns.org/set-cookie';
    
    console.log('1. 发送请求到:', url);
    const res = await axios.get(url, {
      timeout: 30000,
      validateStatus: () => true // 接受所有状态码
    });

    console.log('\n2. 响应状态:', res.status);
    console.log('3. 响应体:', JSON.stringify(res.data, null, 2));

    // 提取 Set-Cookie（可能是数组或单个字符串）
    const h = res.headers || {};
    let setCookie = h['set-cookie'] || h['Set-Cookie'] || h['SET-COOKIE'];
    
    console.log('\n4. Set-Cookie 原始值类型:', typeof setCookie);
    console.log('5. Set-Cookie 是否为数组:', Array.isArray(setCookie));
    console.log('6. Set-Cookie 值:', JSON.stringify(setCookie, null, 2));

    // 规范化为数组
    let cookies = [];
    if (Array.isArray(setCookie)) {
      cookies = setCookie;
    } else if (typeof setCookie === 'string') {
      cookies = [setCookie];
    }

    console.log('\n7. 解析后的 cookies 数量:', cookies.length);
    console.log('8. 所有 cookies:');
    cookies.forEach((cookie, index) => {
      console.log(`   [${index}] ${cookie}`);
    });

    // 验证结果
    console.log('\n=== 验证结果 ===');
    if (cookies.length >= 2) {
      console.log('✅ 成功: 获取到多个 Set-Cookie');
      console.log('   - test_token:', cookies.find(c => c.includes('test_token')) ? '✓' : '✗');
      console.log('   - sessionid:', cookies.find(c => c.includes('sessionid')) ? '✓' : '✗');
      return true;
    } else {
      console.log('❌ 失败: 只获取到', cookies.length, '个 Set-Cookie');
      console.log('   预期: 2 个（test_token 和 sessionid）');
      return false;
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应体:', error.response.data);
    }
    return false;
  }
}

// 运行测试
testSetCookie().then(success => {
  console.log('\n=== 测试', success ? '通过' : '失败', '===');
  return { success };
}).catch(err => {
  console.error('测试异常:', err);
  return { success: false, error: err.message };
});
