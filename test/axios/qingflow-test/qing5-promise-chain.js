const axios = require('axios');

function getUserIdByEmail(email, token) {
    return axios.get("https://api.qingflow.com/user/getId?email=" + email, {
        headers: { accessToken: token }
    })
    .then(function(response) {
        return response.data.result[0].userId;
    })
    .catch(function(error) {
        return { error: '获取用户ID失败: ' + error.message };
    });
}

function getDepartmentsByUserId(userId, token) {
    return axios.get("https://api.qingflow.com/user/" + userId, {
        headers: { accessToken: token }
    })
    .then(function(response) {
        return response.data.result.department;
    })
    .catch(function(error) {
        return { error: '获取部门列表失败: ' + error.message };
    });
}

function getDepartmentDetails(deptId, token) {
    return axios.get("https://api.qingflow.com/department/" + deptId, {
        headers: { accessToken: token }
    })
    .then(function(response) {
        var result = response.data.result;
        var fullName = result.name;

        // 如果存在父部门，递归获取父部门名称
        if (result.parentId) {
            return getDepartmentDetails(result.parentId, token)
                .then(function(parentName) {
                    if (parentName.error) return parentName;
                    return parentName + "%" + fullName;
                });
        }

        return fullName;
    })
    .catch(function(error) {
        return { error: '获取部门详情失败: ' + error.message };
    });
}

function getFullDepartmentNames(departmentIds, token) {
    var promises = [];
    for (var i = 0; i < departmentIds.length; i++) {
        promises.push(getDepartmentDetails(departmentIds[i], token));
    }
    
    return Promise.all(promises)
        .then(function(departmentNames) {
            // 检查是否有错误
            for (var i = 0; i < departmentNames.length; i++) {
                if (departmentNames[i].error) {
                    return departmentNames[i];
                }
            }
            return departmentNames.join('&&&');
        });
}

function processEmail(email, token) {
    return getUserIdByEmail(email, token)
        .then(function(userId) {
            if (userId.error) return userId;
            return getDepartmentsByUserId(userId, token);
        })
        .then(function(departmentIds) {
            if (departmentIds.error) return departmentIds;
            return getFullDepartmentNames(departmentIds, token);
        })
        .then(function(departmentNamesString) {
            if (departmentNamesString.error) return departmentNamesString;
            return { departmentNamesString: departmentNamesString };
        });
}

if (input.email == null) {
    return { departmentNamesString: null };
} else {
    return processEmail(input.email, input.token);
}



