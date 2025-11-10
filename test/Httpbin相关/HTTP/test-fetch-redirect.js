const BASE_URL = 'https://httpbin.qingflow.dpdns.org';

async function test() {
  console.log('\n=== 测试 fetch redirect: manual ===\n');
  
  try {
    const res = await fetch(`${BASE_URL}/redirect-to?url=${encodeURIComponent(BASE_URL + '/get')}`, {
      redirect: 'manual'
    });
    
    console.log('✓ 请求成功');
    console.log('  状态码:', res.status);
    console.log('  状态文本:', res.statusText);
    console.log('  Location:', res.headers.get('location'));
    console.log('  所有 headers:');
    res.headers.forEach((value, key) => {
      console.log(`    ${key}: ${value}`);
    });
    
  } catch (error) {
    console.log('✗ 请求失败');
    console.log('  错误消息:', error.message);
  }
}

test();
