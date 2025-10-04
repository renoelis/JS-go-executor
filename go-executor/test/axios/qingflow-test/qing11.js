var axios = require('axios');

var config = {
  method: 'get',
  url: 'https://test.com/getalltask',
  headers: { 
    'accessToken': 'testToken'
  }
};

return axios(config)
.then(function (res) {
  return {'data':res.data}
});