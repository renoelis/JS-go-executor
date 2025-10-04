const axios = require('axios');

// 第一个接口
function first() {
  let config = {
    method: 'get',
    // 配置第一个接口的请求参数
  };

  return axios.request(config)
    .then(response => {
      // 在第一个接口调用完成后执行其他操作
      // ...
      return second();
    })
    .catch(() => {
      return { error: '第一个接口请求失败' };
    });
}

// 第二个接口
function second() {
  let config = {
    method: 'get',
    // 配置第二个接口的请求参数
  };

  return axios.request(config)
    .then(response => {
      // 在第二个接口调用完成后执行其他操作
      // ...
      return third();
    })
    .catch(() => {
      return { error: '第二个接口请求失败' };
    });
}

// 第三个接口
function third() {
  let config = {
    method: 'get',
    // 配置第三个接口的请求参数
  };

  return axios.request(config)
    .then(response => {
      const res = response.data;
      return { res };
    })
    .catch(() => {
      return { error: '第三个接口请求失败' };
    });
}

// ==================== 执行流程 ====================
return first();
