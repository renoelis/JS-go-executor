const axios = require('axios');

const headers = {   
    'accessToken': '4f8a1078-94454fbab',
    'Content-Type': 'application/json'
};

const apiUrl1 = 'https://ql.966599.com/openApi/app/910ba12d/apply/filter';
const pageSize = 200;

const queriesApi1 = [
    {
        "queId": 60687736,
        "scope": 2
    },
    {
        "queId": 60687737,
        "scope": 2
    }
];

function processPage(apiUrl, pageNum, queries) {
  const postData = {
    pageSize: pageSize.toString(), 
    pageNum: pageNum.toString(),
    queries: queries
  };

  return axios.post(apiUrl, postData, { headers: headers })
    .then(function(response) {
      return response.data.result;
    });
}

function processAllPages(apiUrl, queries, extractQueIds) {
  return processPage(apiUrl, 1, queries)
    .then(function(firstPageData) {
      const totalPages = firstPageData.pageAmount;
      const promises = [];

      for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
        promises.push(processPage(apiUrl, pageNum, queries));
      }

      return Promise.all(promises)
        .then(function(responses) {
          const reslist = extractData(firstPageData, extractQueIds);

          for (let i = 0; i < responses.length; i++) {
            const extractedData = extractData(responses[i], extractQueIds);
            for (let j = 0; j < extractedData.length; j++) {
              reslist.push(extractedData[j]);
            }
          }

          return reslist;
        });
    });
}

function extractData(response, queIds) {
  const result = response.result;
  const res_list = [];

  for (let i = 0; i < result.length; i++) {
    const value = result[i];
    const res_msg = {};

    for (let j = 0; j < value.answers.length; j++) {
      const v = value.answers[j];
      const queId = v.queId;
      const queTitle = v.queTitle;

      if (queIds.indexOf(queId) !== -1) {
        const values = v.values;
        const dataValue = values[0].dataValue;
        res_msg[queTitle] = dataValue;
      }
    }

    res_list.push(res_msg);
  }

  return res_list;
}

// 使用高德地图API获取地址的经纬度
function getAMapCoordinates(address, apiKey) {
    const url = 'https://restapi.amap.com/v3/geocode/geo?address=' + encodeURIComponent(address) + '&key=' + apiKey;
    
    return axios.get(url)
        .then(function(response) {
            if (response.data.status === '1' && response.data.geocodes.length > 0) {
                const location = response.data.geocodes[0].location.split(',');
                const lng = parseFloat(location[0]);
                const lat = parseFloat(location[1]);
                return { lat: lat, lng: lng };
            } else {
                return { error: '地理编码失败' };
            }
        })
        .catch(function(error) {
            return { error: '请求发生错误' };
        });
}

// 计算两点之间的距离（单位：km）
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const radLat1 = lat1 * Math.PI / 180.0;
    const radLat2 = lat2 * Math.PI / 180.0;
    const a = radLat1 - radLat2;
    const b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
    const s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    return s * R;
}

// 找到最近的客户编码
function findNearestCustomer(table, address, apiKey) {
    return getAMapCoordinates(address, apiKey)
        .then(function(coords) {
            if (coords.error) {
                return { error: '无法获取地址的经纬度' };
            }

            const addressLat = coords.lat;
            const addressLng = coords.lng;
            let nearestDistance = Infinity;
            let nearestCustomerCode = null;

            for (let i = 0; i < table.length; i++) {
                const customer = table[i];
                if (customer.经度 && customer.纬度) {
                    const distance = calculateDistance(
                        addressLat, 
                        addressLng, 
                        parseFloat(customer.纬度), 
                        parseFloat(customer.经度)
                    );
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestCustomerCode = customer.客户编码;
                    }
                }
            }

            return { 
                nearestCustomerCode: nearestCustomerCode,
                distance: nearestDistance 
            };
        });
}

// 主函数
function main() {
  const extractQueIdsApi1 = [60412694, 60687736, 60687737];
  const address = input.address || "重庆彭水县联合乡蔡家坝村1组";
  const apiKey = input.apiKey || '3eb1e67c20371****15660';

  // 地址为空的情况
  if (!address || address === "") {
    return { nearestCustomerCode: null };
  }

  // 获取所有数据并找到最近的客户
  return processAllPages(apiUrl1, queriesApi1, extractQueIdsApi1)
    .then(function(reslist1) {
      return findNearestCustomer(reslist1, address, apiKey);
    })
    .then(function(result) {
      if (result.error) {
        return { 
          success: false, 
          error: result.error 
        };
      }
      
      return {
        success: true,
        nearestCustomerCode: result.nearestCustomerCode,
        distance: result.distance
      };
    })
    .catch(function(error) {
      return {
        success: false,
        error: error.message || '处理过程中发生错误'
      };
    });
}

return main();



