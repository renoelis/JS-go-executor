const axios = require('../../assets/axios.js');

const BASE_URL = 'https://httpbin.qingflow.dpdns.org';
const client = axios.create({ baseURL: BASE_URL });

async function test() {
  console.log('\n=== 测试 302 状态码处理 ===\n');
  
  try {
    const res = await client.get('/redirect-to', {
      params: { url: `${BASE_URL}/get` },
      maxRedirects: 0
    });
    
    console.log('✓ 请求成功');
    console.log('  状态码:', res.status);
    console.log('  Location:', res.headers['location']);
    console.log('  Headers:', Object.keys(res.headers));
    
  } catch (error) {
    console.log('✗ 请求失败');
    console.log('  错误消息:', error.message);
    console.log('  错误响应状态:', error.response ? error.response.status : 'N/A');
    console.log('  错误类型:', error.constructor.name);
    console.log('  isAxiosError:', error.isAxiosError);
  }
}

test();
