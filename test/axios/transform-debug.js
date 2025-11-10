const axios = require('axios');

console.log('=== transformRequest 调试测试 ===\n');

return axios.post('https://httpbin.org/post', {
  name: 'Test'
}, {
  transformRequest: [function(data, headers) {
    console.log('transformRequest 被调用');
    console.log('输入数据类型:', typeof data);
    console.log('输入数据:', JSON.stringify(data));
    
    var transformed = {
      original: data,
      modified: true
    };
    
    console.log('转换后数据:', JSON.stringify(transformed));
    var result = JSON.stringify(transformed);
    console.log('返回数据:', result);
    return result;
  }]
})
.then(function(response) {
  console.log('\n=== 响应数据 ===');
  console.log('response.data.data:', response.data.data);
  var parsed = JSON.parse(response.data.data);
  console.log('解析后:', JSON.stringify(parsed));
  console.log('modified字段:', parsed.modified);
  
  return {
    success: parsed.modified === true
  };
})
.catch(function(error) {
  console.log('错误:', error.message);
  return {success: false};
});

