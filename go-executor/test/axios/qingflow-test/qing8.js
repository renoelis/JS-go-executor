const axios = require('axios');

const headers = {   
  'accessToken': '4f8a1078-94454fbab',
  'Content-Type': 'application/json'
};

const apiUrl1 = 'https://ql.966599.com/openApi/app/910ba12d/apply/filter';
const pageSize = 200;

const queriesApi1 = [
  { "queId": 60687736, "scope": 2 },
  { "queId": 60687737, "scope": 2 }
]; // API1的查询条件

// ==================== 分页请求 ====================
function processPage(apiUrl, pageNum, queries) {
  const postData = {
    pageSize: pageSize.toString(),
    pageNum: pageNum.toString(),
    queries: queries
  };

  return axios.post(apiUrl, postData, { headers })
    .then(response => response.data.result)
    .catch(() => ({ result: [], pageAmount: 0 }));
}

// ==================== 全部分页数据 ====================
function processAllPages(apiUrl, queries, extractQueIds) {
  return processPage(apiUrl, 1, queries).then(firstPageData => {
    let totalPages = firstPageData.pageAmount;
    const promises = [];

    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      promises.push(processPage(apiUrl, pageNum, queries));
    }

    return Promise.all(promises).then(responses => {
      const reslist = extractData(firstPageData, extractQueIds);
      responses.forEach(data => {
        const extractedData = extractData(data, extractQueIds);
        reslist.push(...extractedData);
      });
      return reslist;
    });
  });
}

// ==================== 提取指定字段 ====================
function extractData(response, queIds) {
  const result = response.result || [];
  const res_list = [];

  result.forEach(value => {
    const res_msg = {};
    (value.answers || []).forEach(v => {
      if (queIds.includes(v.queId)) {
        const values = v.values || [];
        if (values.length > 0) {
          res_msg[v.queTitle] = values[0].dataValue;
        }
      }
    });
    res_list.push(res_msg);
  });

  return res_list;
}

// ==================== 调用高德API取经纬度 ====================
function getAMapCoordinates(address, apiKey) {
  const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${apiKey}`;
  return axios.get(url)
    .then(response => {
      if (response.data.status === '1' && response.data.geocodes.length > 0) {
        const location = response.data.geocodes[0].location.split(',');
        const lng = parseFloat(location[0]);
        const lat = parseFloat(location[1]);
        return { lat, lng };
      } else {
        return { error: '地理编码失败' };
      }
    })
    .catch(() => ({ error: '请求发生错误' }));
}

// ==================== 计算两点距离 ====================
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const radLat1 = lat1 * Math.PI / 180.0;
  const radLat2 = lat2 * Math.PI / 180.0;
  const a = radLat1 - radLat2;
  const b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
  const s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
  return s * R;
}

// ==================== 找到最近客户编码 ====================
function findNearestCustomer(table, address, apiKey) {
  return getAMapCoordinates(address, apiKey).then(coords => {
    if (coords.error) {
      return { error: '无法获取地址的经纬度' };
    }

    let nearestDistance = Infinity;
    let nearestCustomerCode = null;

    table.forEach(customer => {
      if (customer.经度 && customer.纬度) {
        const distance = calculateDistance(coords.lat, coords.lng, parseFloat(customer.纬度), parseFloat(customer.经度));
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestCustomerCode = customer.客户编码;
        }
      }
    });

    return { nearestCustomerCode };
  });
}

// ==================== 主执行流程 ====================
function main(address, apiKey) {
  const extractQueIdsApi1 = [60412694, 60687736, 60687737];

  return processAllPages(apiUrl1, queriesApi1, extractQueIdsApi1)
    .then(reslist1 => {
      if (address == null || address === "") {
        return { nearestCustomerCode: null };
      }
      return findNearestCustomer(reslist1, address, apiKey);
    })
    .catch(() => ({ error: '请求发生错误' }));
}

// ==================== 示例调用 ====================
const address = "重庆彭水县联合乡蔡家坝村1组"; // 替换成具体定位字段
const apiKey = "3eb1e67c20371****15660"; // 替换为高德API Key

return main(address, apiKey);
