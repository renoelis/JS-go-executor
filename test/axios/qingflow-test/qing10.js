var axios = require('axios');
//请求体
var data = JSON.stringify({
  "jobName": "updateTest"
});

var config = {
  method: 'post',
  url: 'https://kc.oalite.com/returnAll/test',
  headers: { 
    'accessToken': 'testToken', 
    'Content-Type': 'application/json'
  },
  data : data
};

return axios(config)
.then(function (res) {
  return {'data':res.data}
});
