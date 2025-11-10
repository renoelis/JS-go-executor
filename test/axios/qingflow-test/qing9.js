const axios = require('axios');

// ==================== 获取坐标 ====================
function getCoordinates(apiKey, address) {
  const apiUrl = 'http://api.map.baidu.com/geocoding/v3';
  const params = {
    address: address,
    ak: apiKey,
    output: 'json',
  };

  return axios.get(apiUrl, { params })
    .then(response => {
      const location = response.data.result.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    })
    .catch(() => ({ error: '获取坐标信息失败' }));
}

// ==================== 计算两点之间的驾车距离 ====================
function calculateDistance(apiKey, lat1, lon1, lat2, lon2) {
  const apiUrl = 'https://api.map.baidu.com/directionlite/v1/driving';
  const params = {
    origin: `${lat1},${lon1}`,
    destination: `${lat2},${lon2}`,
    ak: apiKey,
    output: 'json',
  };

  return axios.get(apiUrl, { params })
    .then(response => {
      const distance = response.data.result.routes[0].distance;
      return distance;
    })
    .catch(() => ({ error: '获取距离信息失败' }));
}

// ==================== 示例调用 ====================
const apiKey = 'G2OhFhLY9WV9Rh***SVe7sA3R';
const targetAddress = "重庆市彭水苗族土家自治县绍庆街道阿依路重庆烟叶复烤有限公司彭水复烤厂";
const originAddress = "重庆市彭水苗族土家族自治县阿依路186附1号";

function main(apiKey, originAddress, targetAddress) {
  if (targetAddress == null || originAddress == null) {
    return { a: null };
  }

  return getCoordinates(apiKey, originAddress)
    .then(originCoordinates => {
      if (originCoordinates.error) return originCoordinates;

      return getCoordinates(apiKey, targetAddress).then(targetCoordinates => {
        if (targetCoordinates.error) return targetCoordinates;

        const lat1 = originCoordinates.latitude;
        const lon1 = originCoordinates.longitude;
        const lat2 = targetCoordinates.latitude;
        const lon2 = targetCoordinates.longitude;

        return calculateDistance(apiKey, lat1, lon1, lat2, lon2).then(distance => {
          if (distance.error) return distance;

          return {
            "经营地址GPS": {
              "latitude": lat1,
              "longitude": lon1
            },
            "定位地址GPS": {
              "latitude": lat2,
              "longitude": lon2
            },
            "距离": distance
          };
        });
      });
    })
    .catch(() => ({ error: '请求过程中发生错误' }));
}

return main(apiKey, originAddress, targetAddress);
