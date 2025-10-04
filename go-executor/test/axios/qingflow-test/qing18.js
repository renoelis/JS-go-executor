const axios = require('axios');

let data = JSON.stringify({
  "pageSize": "50",
  "pageNum": "1"
});

let config = {
  method: 'post',
  url: 'https://api.qingflow.com/app/6kechv9d8801/apply/filter',
  headers: {
    'accessToken': 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
    'Content-Type': 'application/json'
  },
  data: data
};

function main() {
  return axios(config)
    .then(function (res) {
      const msg = res.data;
      const result = msg.result.result || [];
      const res_list = [];

      result.forEach(value => {
        const res_msg = {
          // 预设字段默认 null
          '单行文字': null,
          '单行w': null,
          '单行文字1': null
        };

        (value.answers || []).forEach(v => {
          const queId = v.queId;
          const queTitle = v.queTitle;

          if ([230540649, 230540650, 230540651].includes(queId)) {
            const values = v.values || [];
            const dataValue = values.length > 0 ? values[0].dataValue : null;
            res_msg[queTitle] = dataValue;
          }
        });

        res_list.push(res_msg);
      });

      return { res_list };
    })
    .catch(function () {
      return { error: '请求发生错误' };
    });
}

return main();
