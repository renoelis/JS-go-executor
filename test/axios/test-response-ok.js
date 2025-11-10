const BASE_URL = 'https://httpbin.qingflow.dpdns.org';

async function test() {
  console.log('\n=== 测试 response.ok 属性 ===\n');
  
  const res = await fetch(`${BASE_URL}/redirect-to?url=${encodeURIComponent(BASE_URL + '/get')}`, {
    redirect: 'manual'
  });
  
  console.log('状态码:', res.status);
  console.log('response.ok:', res.ok);
  console.log('');
  console.log('说明: response.ok 只对 2xx 状态码返回 true');
  console.log('      3xx 状态码会返回 false');
}

test();
