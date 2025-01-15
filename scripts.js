import fetch from 'node-fetch'; // HTTP请求库
import { logger } from './logger.js'; // 日志模块
import { HttpsProxyAgent } from 'https-proxy-agent'; // 代理支持

/**
 * 核心HTTP请求函数
 * @param {string} url - 请求URL
 * @param {string} method - HTTP方法
 * @param {object} headers - 请求头
 * @param {object} payloadData - 请求体数据
 * @param {string} proxy - 代理地址
 * @returns {Promise<object>} - 返回响应数据
 */
async function coday(url, method, headers, payloadData = null, proxy = null) {
    try {
        const options = {
            method,
            headers,
        };

        if (payloadData) {
            options.body = JSON.stringify(payloadData);
        }

        if (proxy) {
            const agent = new HttpsProxyAgent(proxy);
            options.agent = agent;
        }

        const response = await fetch(url, options);
        const jsonData = await response.json().catch(() => ({}));

        if (!response.ok) {
            return { error: true, status: response.status, data: jsonData };
        }
        return jsonData;
    } catch (error) {
        logger(`Error in coday: ${error.message}`, 'error');
        return { error: true, message: error.message };
    }
}

/**
 * 估算奖励
 * @param {string} id - 唯一ID
 * @param {object} headers - 请求头
 * @param {string} proxy - 代理地址
 * @returns {Promise<object>} - 返回估算结果
 */
async function estimate(id, headers, proxy) {
    const url = 'https://api.meshchain.ai/meshmain/rewards/estimate';
    const result = await coday(url, 'POST', headers, { unique_id: id }, proxy);

    return result || undefined;
}

/**
 * 领取奖励
 * @param {string} id - 唯一ID
 * @param {object} headers - 请求头
 * @param {string} proxy - 代理地址
 * @returns {Promise<number|null>} - 返回领取的奖励数量
 */
async function claim(id, headers, proxy) {
    const url = 'https://api.meshchain.ai/meshmain/rewards/claim';
    const result = await coday(url, 'POST', headers, { unique_id: id }, proxy);
    console.log(result);
    return result.total_reward || null;
}

/**
 * 开始挖矿
 * @param {string} id - 唯一ID
 * @param {object} headers - 请求头
 * @param {string} proxy - 代理地址
 * @returns {Promise<object|null>} - 返回启动结果
 */
async function start(id, headers, proxy) {
    const url = 'https://api.meshchain.ai/meshmain/rewards/start';
    const result = await coday(url, 'POST', headers, { unique_id: id }, proxy);

    return result || null;
}

/**
 * 获取节点状态信息
 * @param {string} id - 唯一ID
 * @param {object} headers - 请求头
 * @param {string} proxy - 代理地址
 * @returns {Promise<object|null>} - 返回节点状态
 */
async function info(id, headers, proxy) {
    const url = 'https://api.meshchain.ai/meshmain/nodes/status';
    const result = await coday(url, 'POST', headers, { unique_id: id }, proxy);

    return result || null;
}

async function infoSpin(headers, proxy) {
    const url = 'https://api.meshchain.ai/meshmain/lucky-wheel/next-round';
    const result = await coday(url, 'GET', headers, null, proxy);

    return result || null;
}

async function doSpin(headers, proxy) {
    const url = 'https://api.meshchain.ai/meshmain/lucky-wheel/spin';
    const result = await coday(url, 'POST', headers, {}, proxy);

    return result || null;
}

async function init(headers, unique_id, proxy) {
    const url = "https://api.meshchain.ai/meshmain/nodes/link";
    const payload = { unique_id, "node_type": "browser", "name": "Extension" };

    const response = await coday(url, 'POST', headers, payload, proxy);
    return response || null;
}
async function getTokensInfo(headers, proxy) {
    const url = 'https://api.meshchain.ai/meshmain/wallet/tokens';
    const result = await coday(url, 'GET', headers, null, proxy);

    return result || null;
}
/**
 * 提现功能
 * @param {string} to_address - 目标地址
 * @param {string} asset_address - 资产地址
 * @param {number} usdtAmount - USDT数量
 * @param {object} headers - 请求头
 * @param {string} proxy - 代理地址
 * @returns {Promise<object|null>} - 返回提现结果
 */
async function withdraw(to_address, asset_address, usdtAmount, headers, proxy) {
    const payload = {
        to_address,
        asset_address,
        total_amount: usdtAmount
    };
    const url = 'https://api.meshchain.ai/meshmain/withdraw';
    const result = await coday(url, 'POST', headers, payload, proxy);

    return result || null;
}

async function getNodeId(headers, proxy) {
    const url = 'https://api.meshchain.ai/meshmain/nodes';
    const result = await coday(url, 'GET', headers, null, proxy);

    return result || null;
}
export { coday, estimate, claim, start, info, infoSpin, doSpin, init, withdraw, getTokensInfo, getNodeId };
