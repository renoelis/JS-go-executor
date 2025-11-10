//成员字段转为userid进行输出，以“|”分隔

const axios = require('axios');

// 测试 API 地址
const API_URL = 'https://api.qingflow.com/user/getId';
const ACCESS_TOKEN = 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2'; // 接口访问的 accessToken

// ==================== 主逻辑函数 ====================
function getUserIds(emails) {
  console.log('📋 开始执行 getUserIds');

  // 用户 ID 数组
  const userIds = [];

  // 循环处理每个邮箱（Promise 链）
  let chain = Promise.resolve();

  emails.forEach(function (email) {
    chain = chain.then(function () {
      console.log('⏳ 请求邮箱:', email);

      return axios.get(API_URL, {
        headers: {
          accessToken: ACCESS_TOKEN
        },
        params: {
          email: email
        }
      })
        .then(function (response) {
          console.log('✅ 请求成功');
          console.log('   状态码:', response.status);

          const resData = response.data.result;

          if (response.data.errCode === 0 && resData.length > 0) {
            console.log('   ✓ 获取到 userId:', resData[0].userId);
            userIds.push(resData[0].userId);
          } else {
            throw new Error('接口返回错误或未找到用户ID');
          }
        })
        .catch(function (error) {
          console.log('❌ 请求失败:', error.message);
          throw error;
        });
    });
  });

  // 所有请求完成后拼接结果
  return chain.then(function () {
    const result = userIds.join('|');
    console.log('\n所有请求完成');
    console.log('   userIds:', result);

    return result;
  })
    .catch(function () {
      return { error: '请求发生错误' };
    });
}

// ==================== 示例调用 ====================
const emails =[ "zhangziqi@exiao.tech","lifeifei@exiao.tech"]; // 替换成表单具体成员字段

if (emails == null) {
  return { result: null };
} else {
  return getUserIds(emails);
}
