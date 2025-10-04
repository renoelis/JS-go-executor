const axios = require('axios');

console.log('=== 简单测试：transformRequest ===\n');

// 测试1：transformRequest 返回字符串
console.log('测试1: transformRequest 返回字符串');
return axios.post('https://httpbin.org/post', { value: 1 }, {
  transformRequest: [function(data) {
    console.log('转换器输入:', typeof data, JSON.stringify(data));
    var result = '{"transformed":true,"value":1}';
    console.log('转换器输出:', typeof result, result);
    return result;
  }]
})
.then(function(response) {
  console.log('服务器收到的数据:', response.data.data);
  var received = JSON.parse(response.data.data);
  console.log('是否包含 transformed 字段:', received.transformed === true);
  
  return {
    test1: received.transformed === true,
    receivedData: response.data.data
  };
})
.catch(function(error) {
  console.log('错误:', error.message);
  return { test1: false, error: error.message };
});






