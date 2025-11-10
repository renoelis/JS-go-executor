const axios = require('axios');

async function getUserIdByEmail(email, token) {
    try {
        const response = await axios.get("https://api.qingflow.com/user/getId?email=" + email, {
            headers: { accessToken: token }
        });
        return response.data.result[0].userId;
    } catch (error) {
        return { error: '获取用户ID失败: ' + error.message };
    }
}

async function getDepartmentsByUserId(userId, token) {
    try {
        const response = await axios.get("https://api.qingflow.com/user/" + userId, {
            headers: { accessToken: token }
        });
        return response.data.result.department;
    } catch (error) {
        return { error: '获取部门列表失败: ' + error.message };
    }
}

async function getDepartmentDetails(deptId, token) {
    try {
        const response = await axios.get("https://api.qingflow.com/department/" + deptId, {
            headers: { accessToken: token }
        });
        const result = response.data.result;
        let fullName = result.name;

        // 如果存在父部门，递归获取父部门名称
        if (result.parentId) {
            const parentName = await getDepartmentDetails(result.parentId, token);  // ✅ 添加 token
            fullName = parentName + "%" + fullName;
        }

        return fullName;
    } catch (error) {
        return { error: '获取部门详情失败: ' + error.message };
    }
}

async function getFullDepartmentNames(departmentIds, token) {
    const departmentNames = [];
    for (let i = 0; i < departmentIds.length; i++) {
        const deptId = departmentIds[i];
        const deptName = await getDepartmentDetails(deptId, token);  // ✅ 添加 token
        
        // 检查是否返回错误
        if (deptName.error) {
            return deptName;  // 返回错误对象
        }
        
        departmentNames.push(deptName);
    }
    return departmentNames.join('&&&');
}

async function processEmail(email, token) {
    const userId = await getUserIdByEmail(email, token);
    if (userId.error) return userId;

    const departmentIds = await getDepartmentsByUserId(userId, token);
    if (departmentIds.error) return departmentIds;

    const departmentNamesString = await getFullDepartmentNames(departmentIds, token);
    
    // 检查是否返回错误对象
    if (departmentNamesString.error) {
        return departmentNamesString;
    }
    
    return { departmentNamesString: departmentNamesString };
}

if (input.email == null) {
    return { departmentNamesString: null };
} else {
    return processEmail(input.email, input.token);
}



