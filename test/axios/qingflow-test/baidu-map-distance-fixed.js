const axios = require('axios');

if (!input.apiKey || !input.originAddress || !input.targetAddress) {
  return { error: "缺少必要的参数 apiKey / originAddress / targetAddress" };
}

function getCoordinates(apiKey, address) {
  const apiUrl = "http://api.map.baidu.com/geocoding/v3";
  const params = { 
    address: address, 
    ak: apiKey, 
    output: "json" 
  };

  return axios.get(apiUrl, { params: params })
    .then(function(response) {
      if (response.data.status !== 0) {
        return { error: "获取坐标失败: " + (response.data.msg || "未知错误") };
      }
      const location = response.data.result.location;
      return { 
        latitude: location.lat, 
        longitude: location.lng 
      };
    })
    .catch(function(err) {
      return { error: "获取坐标信息失败: " + err.message };
    });
}

function calculateDistance(apiKey, lat1, lon1, lat2, lon2) {
  const apiUrl = "https://api.map.baidu.com/directionlite/v1/driving";
  const params = {
    origin: lat1 + "," + lon1,
    destination: lat2 + "," + lon2,
    ak: apiKey,
    output: "json"
  };

  return axios.get(apiUrl, { params: params })
    .then(function(response) {
      if (response.data.status !== 0) {
        return { error: "获取距离失败: " + (response.data.message || "未知错误") };
      }
      return response.data.result.routes[0].distance; // 单位：米
    })
    .catch(function(err) {
      return { error: "获取距离信息失败: " + err.message };
    });
}

// 主函数
function main() {
  return getCoordinates(input.apiKey, input.originAddress)
    .then(function(originCoordinates) {
      if (originCoordinates.error) {
        return { error: originCoordinates.error };
      }

      return getCoordinates(input.apiKey, input.targetAddress)
        .then(function(targetCoordinates) {
          if (targetCoordinates.error) {
            return { error: targetCoordinates.error };
          }

          return calculateDistance(
            input.apiKey,
            originCoordinates.latitude,
            originCoordinates.longitude,
            targetCoordinates.latitude,
            targetCoordinates.longitude
          )
          .then(function(distance) {
            if (distance.error) {
              return { error: distance.error };
            }

            return {
              success: true,
              originAddress: input.originAddress,
              targetAddress: input.targetAddress,
              "经营地址GPS": originCoordinates,
              "定位地址GPS": targetCoordinates,
              "距离(米)": distance
            };
          });
        });
    })
    .catch(function(err) {
      return { 
        success: false, 
        error: err.message 
      };
    });
}

return main();



