import fs from 'fs/promises'; // 文件系统模块
import { logger } from './logger.js'; // 日志模块
import { getTokensInfo, withdraw } from './scripts.js'; // 脚本功能模块
import readline from 'readline'; // 命令行交互模块

// 创建命令行交互接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * 读取token和代理信息
 * @returns {Promise<Array>} - 返回账户信息数组
 */
async function readTokensAndIds() {
    try {
        const tokenData = await fs.readFile('token.txt', 'utf-8');
        const tokens = tokenData
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && line.includes('|'));

        let proxies = [];
        try {
            const proxyData = await fs.readFile('proxy.txt', 'utf-8');
            proxies = proxyData.split('\n').filter(line => line.trim());
        } catch (err) {
            logger("File proxy.txt not found, Running without proxy", 'warn');
        }

        if (proxies.length === 0) {
            proxies = null;
        }

        const accounts = tokens.map((line, index) => {
            const [access_token, refresh_token] = line.split('|').map(token => token.trim());

            return { access_token, refresh_token, proxy: proxies ? proxies[index % proxies.length] : null };
        });

        return accounts;
    } catch (err) {
        logger("Failed to read token file:", "error", err.message);
        return [];
    }
}

/**
 * 命令行提问功能
 * @param {string} query - 提问内容
 * @returns {Promise<string>} - 返回用户输入
 */
function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

/**
 * 主函数：处理提现逻辑
 */
async function main() {
    const accounts = await readTokensAndIds();

    if (accounts.length === 0) {
        logger("No accounts to process.", "error");
        return;
    }

    logger(`Processing Checking Balance ${accounts.length} accounts...`, "info");

    for (let index = 0; index < accounts.length; index++) {
        const account = accounts[index];

        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${account.access_token}`,
        };

        try {
            const tokensData = await getTokensInfo(headers, account.proxy);
            if (tokensData && tokensData.data) {
                if (!Array.isArray(tokensData.data)) {
                    console.error("error:", tokensData.data.message);
                    continue;
                }

                const usdtEntry = tokensData.data.find(entry => entry.symbol === "USDT");

                if (usdtEntry) {
                    const usdtBalance = Number(BigInt(usdtEntry.balance) / BigInt(10) ** BigInt(usdtEntry.decimals));

                    const result = {
                        name: usdtEntry.address,
                        balance: usdtBalance,
                        decimals: usdtEntry.decimals,
                    };

                    console.log('Balance :', result);
                    if (usdtBalance > 0) {
                        logger(`Account #${index + 1} has $${usdtBalance} USDT input address to withdraw...`, "warn");
                        const to_address = await askQuestion('Please enter address you want to send USDT (BEP20): ');

                        console.log(`Your entered address is: ${to_address}. Make sure it is correct.`);
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        try {
                            let wd = await withdraw(to_address, result.name, usdtBalance, headers, account.proxy);

                            while (wd && wd.data && wd.data.message === 'Cannot withdraw at this time, please try again later') {
                                console.log('Cannot withdraw at this time, Retrying in 3 seconds...');
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                wd = await withdraw(to_address, result.address, usdtBalance, headers, account.proxy);
                            }

                            if (wd) {
                                console.log('Withdrawal successful:', wd);
                                logger(`Successful withdraw ${usdtBalance} USDT to address ${to_address}`, "success");
                            } else {
                                logger(`Failed to withdraw ${usdtBalance} USDT to address ${to_address}`, "error");
                            }
                        } catch (error) {
                            logger(`Error during withdrawal: ${error.message}`, "error");
                        }
                    }
                } else {
                    console.log("USDT Token not found or token is expired...");
                }
            }
            logger(`Account ${index + 1} Check completed successfully`, "info");
        } catch (error) {
            logger(`Error processing account ${index + 1}: ${error.message}`, "error");
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    rl.close();
}

main();
