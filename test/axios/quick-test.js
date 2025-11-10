/**
 * Axios 快速验证测试
 * 快速验证 axios 模块是否正确加载和工作
 */

console.log('📋 Axios 快速验证测试');
console.log('='.repeat(50));

// ==================== 测试 1: 模块加载 ====================
console.log('\n📋 ⏳测试 1: 加载 axios 模块');

try {
  const axios = require('axios');
  console.log('✅ axios 模块加载成功');
  console.log('   axios 类型:', typeof axios);
  console.log('   axios.get 存在:', typeof axios.get === 'function');
  console.log('   axios.post 存在:', typeof axios.post === 'function');
  console.log('   axios.create 存在:', typeof axios.create === 'function');
  console.log('   axios.CancelToken 存在:', typeof axios.CancelToken === 'function');
  console.log('   axios.interceptors 存在:', typeof axios.interceptors === 'object');
} catch (error) {
  console.log('❌ axios 模块加载失败:', error.message);
  return { success: false, error: error.message };
}

// ==================== 测试 2: 基础 GET 请求 ====================
console.log('\n📋 测试 2: 基础 GET 请求');

const axios = require('axios');
const TEST_API = 'https://jsonplaceholder.typicode.com';

return axios.get(TEST_API + '/posts/1')
  .then(function(response) {
    console.log('✅ GET 请求成功');
    console.log('   状态码:', response.status);
    console.log('   数据 ID:', response.data.id);
    console.log('   数据标题:', response.data.title.substring(0, 30) + '...');
    
    if (response.status === 200 && response.data.id === 1) {
      console.log('\n' + '='.repeat(50));
      console.log('🎉 Axios 模块验证通过！');
      console.log('='.repeat(50));
      
      return {
        success: true,
        message: 'Axios 模块工作正常',
        response: {
          status: response.status,
          dataId: response.data.id
        }
      };
    } else {
      throw new Error('响应数据验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ ⏳ GET 请求失败:', error.message);
    console.log('\n' + '='.repeat(50));
    console.log('❌ Axios 模块验证失败');
    console.log('='.repeat(50));
    
    return {
      success: false,
      error: error.message
    };
  });

