const axios = require('axios');

// 测试 API 地址
const API_URL = 'https://api.qingflow.com/user/getId';
const ACCESS_TOKEN = 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2';

// ==================== 主逻辑函数 ====================
function getUserIds(emails) {
  console.log('[INFO] 开始执行 getUserIds');
  console.log('[INFO] 邮箱列表:', emails.join(', '));

  const userIds = [];
  let chain = Promise.resolve();

  emails.forEach(function (email) {
    chain = chain.then(function () {
      console.log('[REQUEST] 请求邮箱:', email);

      return axios.get(API_URL, {
        headers: {
          accessToken: ACCESS_TOKEN
        },
        params: {
          email: email
        },
        timeout: 10000
      })
        .then(function (response) {
          console.log('[SUCCESS] 状态码:', response.status);

          const resData = response.data.result;

          if (response.data.errCode === 0 && resData.length > 0) {
            console.log('[SUCCESS] 获取到 userId:', resData[0].userId);
            userIds.push(resData[0].userId);
          } else {
            throw new Error('接口返回错误或未找到用户ID');
          }
        })
        .catch(function (error) {
          console.log('[ERROR] 请求失败:', error.message);
          throw error;
        });
    });
  });

  return chain.then(function () {
    const result = userIds.join('|');
    console.log('[COMPLETE] 所有请求完成');
    console.log('[RESULT] userIds:', result);
    return result;
  })
    .catch(function (error) {
      console.log('[ERROR] 捕获到错误:', error.message);
      return { error: '请求发生错误', details: error.message };
    });
}

// ==================== 示例调用 ====================
const emails = ["zhangziqi@exiao.tech", "lifeifei@exiao.tech"];

if (emails == null || emails.length === 0) {
  console.log('[WARN] 邮箱列表为空');
  return { result: null };
} else {
  return getUserIds(emails);
}

