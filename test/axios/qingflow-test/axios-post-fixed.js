const axios = require("axios");

if (!input.url || !input.token || !input.jobName) {
  return { error: "缺少必要参数 url / token / jobName" };
}

function main() {
  const data = {
    jobName: input.jobName
  };

  const config = {
    method: "post",
    url: input.url,
    headers: {
      accessToken: input.token,
      "Content-Type": "application/json"
    },
    data: data  // ✅ 修复：完整语法
  };

  return axios(config)
    .then(function(res) {
      return {
        success: true,
        status: res.status,
        data: res.data
      };
    })
    .catch(function(err) {
      return {
        success: false,
        error: err.message,
        url: input.url
      };
    });
}

return main();



