import fs from 'fs/promises'; // 文件系统模块
import readline from 'readline/promises'; // 命令行输入模块
import { logger } from './logger.js'; // 日志模块
import { solveAntiCaptcha } from './utils/solver.js'; // 验证码解决模块
import { coday } from './scripts.js'; // HTTP请求模块

const tokenPath = 'newTokens.txt'; // 新token存储路径
const accountsPath = 'accounts.txt'; // 账户信息存储路径

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
}); // 创建命令行交互接口

// 读取账户信息
async function readAccounts() {
    try {
        const accountsData = await fs.readFile(accountsPath, 'utf-8');
        const accounts = accountsData
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const emailMatch = line.match(/Email:\s*([^,]+)/);
                const passwordMatch = line.match(/Password:\s*(.+)$/);

                if (emailMatch && passwordMatch) {
                    return { email: emailMatch[1].trim(), password: passwordMatch[1].trim() };
                }

                return null;
            })
            .filter(account => account !== null);

        return accounts;
    } catch (err) {
        console.error("Failed to read accounts file:", err.message);
        return [];
    }
}

// 用户登录功能
async function login(email, password, apiKey) {
    try {
        const captchaToken = await solveAntiCaptcha(apiKey);
        const payloadLogin = {
            captcha_token: captchaToken,
            email: email,
            password: password,
        };

        const response = await coday(
            'https://api.meshchain.ai/meshmain/auth/email-signin',
            'POST',
            {
                'Content-Type': 'application/json',
            },
            payloadLogin
        );

        if (response && response.access_token) {
            logger(`Login successful for ${email}!`, "success");
            return response;
        } else {
            logger(`Login failed for ${email}. Check your credentials or captcha.`, "error");
            return null;
        }
    } catch (error) {
        logger(`Error during login for ${email}: ${error.message}`, "error");
        return null;
    }
}

// 主函数：获取token
const getTokens = async () => {
    try {
        const accounts = await readAccounts();
        logger(`Found ${accounts.length} accounts from accounts.txt file`);
        const apiKey = await rl.question("Enter ApiKey from Anti-Captcha: ");
        for (const account of accounts) {
            try {
                logger(`Trying to login with account: ${account.email}`);
                const loginData = await login(account.email, account.password, apiKey);
                if (loginData) {
                    await fs.appendFile(
                        tokenPath,
                        `${loginData.access_token}|${loginData.refresh_token}\n`,
                        'utf-8'
                    );
                    logger(`Tokens saved for account ${account.email} in ${tokenPath} file.`, "success");
                } else {
                    logger(`Login failed for account ${account.email}`, "error");
                }
            } catch (error) {
                logger(`Error logging in with account ${account.email}: ${error.message}`, "error");
            }
        }
    } catch (error) {
        logger(`Error processing accounts: ${error.message}`, "error");
    } finally {
        rl.close()
    }
}

getTokens()
