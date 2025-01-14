import {
    coday,
    estimate,
    claim,
    start,
    info,
    infoSpin,
    doSpin,
    init,
    getNodeId
} from './scripts.js';
import { logger } from './logger.js';
import fs from 'fs/promises';
import { banner } from './banner.js';

let headers = {
    'Origin': 'https://meshchain.ai',
    'Referer': 'https://meshchain.ai/',
    'Content-Type': 'application/json',
};

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

const asyncLock = {};
const tokenLocks = new Set();

async function lockAndWrite(file, content) {
    while (asyncLock[file]) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    asyncLock[file] = true;

    try {
        await fs.writeFile(file, content, 'utf-8');
    } finally {
        asyncLock[file] = false;
    }
}

async function refreshToken(refresh_token, accountIndex, proxy) {
    if (tokenLocks.has(accountIndex)) {
        logger(`Account ${accountIndex + 1} is already refreshing. Waiting...`, "info");
        while (tokenLocks.has(accountIndex)) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return null;
    }

    tokenLocks.add(accountIndex);

    try {
        logger(`Refreshing access token for Account ${accountIndex + 1}...`, "info");
        const payloadData = { refresh_token };
        const response = await coday("https://api.meshchain.ai/meshmain/auth/refresh-token", 'POST', headers, payloadData, proxy);

        if (response && response.access_token) {
            const tokenLines = (await fs.readFile('token.txt', 'utf-8'))
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);

            tokenLines[accountIndex] = `${response.access_token}|${response.refresh_token}`.trim();
            await lockAndWrite('token.txt', tokenLines.join('\n') + '\n');
            logger(`Account ${accountIndex + 1} token refreshed successfully`, "success");
            return response.access_token;
        }

        logger(`Account ${accountIndex + 1} failed to refresh token`, "error");
        console.log(response);
        return null;
    } catch (err) {
        logger(`Error refreshing token for Account ${accountIndex + 1}: ${err.message}`, "error");
        return null;
    } finally {
        tokenLocks.delete(accountIndex);
    }
}

// Main process for a single account
async function processAccount({ access_token, refresh_token, proxy }, accountIndex) {
    headers = {
        ...headers,
        Authorization: `Bearer ${access_token}`,
    };
    let nodeIds = await getNodeId(headers, proxy);

    if (nodeIds && nodeIds.error) {
        const { status, data } = nodeIds;

        if (status === 401) {
            logger(`Account ${accountIndex + 1}: JWT token expired, attempting to refresh...`, "warn");
            const newAccessToken = await refreshToken(refresh_token, accountIndex, proxy);
            if (!newAccessToken) return;
            headers.Authorization = `Bearer ${newAccessToken}`;
            nodeIds = await getNodeId(headers, proxy);
        } else {
            logger(`Account ${accountIndex + 1} | ${unique_id}: Error fetching Node ids (Error status: ${data?.status}), ${data?.message}`, "error");
            return
        }
    }

    if (!nodeIds?.devices) return;
    const device = nodeIds.devices[0];
    const unique_id = device.unique_id;
    if (!unique_id) {
        logger(`Account ${accountIndex + 1}: unique_id is missing or undefined.`, "error");
        return;
    } else {
        logger(`Account ${accountIndex + 1}: unique_id: ${unique_id}`)
    }

    const is_linked = device.is_linked || false;

    if (!is_linked) {
        logger(`Account ${accountIndex + 1} | ${unique_id}: Node not linked, attempting to link node...`, "warn");
        try {
            await init(headers, unique_id, proxy);
            logger(`Account ${accountIndex + 1} | ${unique_id}: Node linked successfully.`, "success");
        } catch (err) {
            logger(`Account ${accountIndex + 1} | ${unique_id}: Failed to link node: ${err.message}`, "error");
        }
    }

    try {
        const profile = await info(unique_id, headers, proxy);
        if (profile && profile.error) {
            const { status, data } = profile;
            logger(`Account ${accountIndex + 1} | ${unique_id}: Error fetching profile (Error status: ${status}), ${data?.message}`, "error");
        } else if (profile) {
            const { name, total_reward } = profile;
            logger(`Account ${accountIndex + 1} | ${unique_id}: ${name} | Balance: ${total_reward}`, "success");
        } else {
            logger(`Account ${accountIndex + 1} | ${unique_id}: Profile data is invalid or missing.`, "error");
        }
    } catch (err) {
        logger(`Account ${accountIndex + 1} | ${unique_id}: Error fetching profile: ${err.message}`, "error");
    }

    const filled = await estimate(unique_id, headers, proxy);
    if (!filled) {
        logger(`Account ${accountIndex + 1} | ${unique_id}: Failed to fetch estimate.`, "error");
        return;
    } else if (filled.error) {
        const errorMessage = filled.data ? filled.data.message : 'Unknown error';
        logger(`Account ${accountIndex + 1} | ${unique_id}: ${errorMessage}`, "error");

        if (filled.data && filled.data.status === 400) {
            logger(`Account ${accountIndex + 1} | ${unique_id}: Trying to restart mining again due to status 400.`, "info");
            await start(unique_id, headers, proxy);
        }
    }

    if (filled.filled && filled.claimable) {
        logger(`Account ${accountIndex + 1} | ${unique_id}: Attempting to claim reward...`, "info");
        const reward = await claim(unique_id, headers, proxy);
        if (reward) {
            logger(`Account ${accountIndex + 1} | ${unique_id}: Claim successful! New Balance: ${reward}`, "success");
            await start(unique_id, headers, proxy);
            logger(`Account ${accountIndex + 1} | ${unique_id}: Started mining again.`, "info");
        } else {
            logger(`Account ${accountIndex + 1} | ${unique_id}: Failed to claim reward. Ensure your BNB balance is enough.`, "error");
        }
    } else {
        logger(`Account ${accountIndex + 1} | ${unique_id}: Mining already started. Mine value: ${filled.value}`, "info");
    }

};

async function spins() {
    logger('Checking Current Round Spins Information...');
    const accounts = await readTokensAndIds();

    if (accounts.length === 0) {
        logger("No accounts to process.", "error");
        return;
    }

    logger(`Processing Checking ${accounts.length} accounts...`, "info");

    const accountPromises = accounts.map((account, index) => {
        headers = {
            ...headers,
            Authorization: `Bearer ${account.access_token}`,
        };

        return (async () => {
            try {
                const spinsData = await infoSpin(headers, account.proxy);
                if (accounts) {
                    const timeNow = Math.floor(Date.now() / 1000);
                    const { spinStartTime, spinEndTime, maxSpinPerUser, userCurrentSpin } = spinsData;
                    const timesNow = {
                        timeNow: new Date(timeNow * 1000).toLocaleString(),
                        spinEndTime: new Date(spinEndTime * 1000).toLocaleString(),
                        spinStartTime: new Date(spinStartTime * 1000).toLocaleString(),
                    };

                    if (timeNow > spinStartTime && timeNow < spinEndTime && userCurrentSpin < maxSpinPerUser) {
                        logger(`Account ${index + 1}: Let's do Spinning...`);

                        let spinResult = await doSpin(headers, account.proxy);

                        while (spinResult.status >= 500) {
                            logger("Server error retrying in 5 seconds", "error");
                            await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                            spinResult = await doSpin(headers, account.proxy);
                        }

                        console.log(`Spins result for Account ${index + 1}:`, spinResult);
                    } else {
                        logger(`Account ${index + 1}: The current round has already ended, or you have reached the maximum allowed spins.`, 'warn');
                        logger(`Current time: ${timesNow.timeNow} | Next Round Spin Time: ${timesNow.spinStartTime}`, 'warn');
                    }
                }
                logger(`Account ${index + 1} Check completed successfully, proxy: ${account.proxy}`, "info");
            } catch (error) {
                logger(`Error processing account ${index + 1}: ${error.message}`, "error");
            }
        })();
    });

    await Promise.all(accountPromises);
}

async function main() {
    logger(banner, "debug");

    while (true) {
        const accounts = await readTokensAndIds();

        if (accounts.length === 0) {
            logger("No accounts to process.", "error");
            return;
        }

        logger(`Processing ${accounts.length} accounts...`, "info");

        for (let index = 0; index < accounts.length; index++) {
            const account = accounts[index];
            try {
                await processAccount(account, index);
                logger(`Account ${index + 1} processed successfully, proxy: ${account.proxy}`, "info");
            } catch (error) {
                logger(`Error processing account ${index + 1}: ${error.message}`, "error");
            }
        }
        await spins() // spins when already check profile to make sure token being refreshed

        logger("All accounts processed. Waiting 5 minute for the next run.", "info");
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes interval
    }
}

process.on('SIGINT', () => {
    logger('Process terminated by user.', 'warn');
    process.exit(0);
});

// let Start
main();

