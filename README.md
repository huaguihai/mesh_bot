# MESHCHAIN 网络

MeshChain 是一个去中心化网络，旨在为AI工作负载提供经济实惠、可扩展的计算能力。我们解决了AI资源成本高和访问受限的问题，使每个人都能更容易地贡献并从AI的力量中受益。

- [https://app.meshchain.ai/](https://app.meshchain.ai?ref=6JS8N98COFMW)

![mesh](image.png)

# MeshChain 自动化脚本

## 最新更新
- 自动检查USDT余额并自动提现
- 为`accounts.txt`文件中的账户获取新token，运行：`node getToken`
- 新token保存在`newTokens.txt`文件中

- `git pull`后需要重新安装依赖：`npm install`
- 添加了代理支持（可选）：将代理放入`proxy.txt`
- 新增自动旋转功能
- 使用anti-captcha解决验证码 [https://anti-captcha.com/](https://getcaptchasolution.com/lprsposyjx)

本仓库包含用于自动化任务的脚本，如用户注册、邮箱验证、领取奖励和开始挖矿等。

![banner](image-1.png)

## 功能

- 支持多账户
- 注册新账户
- 使用OTP验证邮箱
- 领取BNB水龙头
- 初始化和链接唯一节点

## 要求

- Node.js 16+
- 通过`npm install`安装依赖
- 每个账户需要新邮箱（用于邮箱验证和领取BNB水龙头）
- 1个账户只能链接1个nodeId，所以如果要挖矿需要创建多个账户

## 文件

- 使用脚本注册时会自动生成这些文件
- 如果已有账户可以手动创建文件
- `token.txt`：以`access_token|refresh_token`格式存储token，每行1个账户
- 访问 [https://app.meshchain.ai/](https://app.meshchain.ai?ref=6JS8N98COFMW) 并检查以获取 `access_token|refresh_token`
- ![image](https://github.com/user-attachments/assets/9c1571ef-f80e-4b62-9b59-a21c793bf69d)

- `unique_id.txt`：存储链接节点的唯一ID，每行1个账户
- 检查mesh扩展以获取id
- ![image](https://github.com/user-attachments/assets/f715a727-8a1b-430c-b976-2b4f2d2c2bbd)

## 使用说明

1. 克隆仓库：
   ```bash
   git clone https://github.com/huaguihai/mesh_bot.git
   cd mesh_bot
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 注册账户：
   ```bash
   npm run register
   ```
4. 运行机器人：
   ```bash
   npm run start
   ```

## 附加功能：
- **自动检查并提现USDT**
   ```bash
   npm run withdraw
   ```
- **使用临时邮箱自动注册和验证**

  ```bash
  npm run autoreg
  ```

  ![auto register](image-2.png)
