import { Solver } from "@2captcha/captcha-solver";
import anticaptcha from "@antiadmin/anticaptchaofficial";

const pageurl = "https://app.meshchain.ai/signup"; 
const sitekey = "0x4AAAAAAA0e4lkIb7ZRG1LE"; 

/**
 * 使用2Captcha API解决验证码
 * @param {string} key - 2Captcha API密钥
 * @returns {Promise<string>} - 返回已解决的验证码token
 */
export async function solve2Captcha(key) {
    const solver = new Solver(key);

    try {
        const result = await solver.cloudflareTurnstile({ pageurl, sitekey });
        return result.data; // Return the solved token
    } catch (err) {
        throw new Error(`2Captcha Error: ${err.message}`);
    }
}

/**
 * 使用Anti-Captcha API解决验证码
 * @param {string} key - Anti-Captcha API密钥
 * @returns {Promise<string>} - 返回已解决的验证码token
 */
export async function solveAntiCaptcha(key) {
    anticaptcha.setAPIKey(key);

    try {
        const token = await anticaptcha.solveTurnstileProxyless(pageurl, sitekey);
        console.log("Anti-Captcha Solved!");
        return token; // Return the solved token
    } catch (err) {
        throw new Error(`Anti-Captcha Error: ${err.message}`);
    }
}
