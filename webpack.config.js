const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');

// 仅加载根目录下的 .env 文件，所有构建都使用同一套 env
require('dotenv').config({ path: '.env' });

// 读取证书
const certPath = path.join(require('os').homedir(), '.office-addin-dev-certs');
const httpsOptions = fs.existsSync(path.join(certPath, 'localhost.crt')) ? {
    key: fs.readFileSync(path.join(certPath, 'localhost.key')),
    cert: fs.readFileSync(path.join(certPath, 'localhost.crt')),
    ca: fs.readFileSync(path.join(certPath, 'ca.crt')),
} : {};

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: {
            taskpane: './src/taskpane/index.tsx',
            commands: './src/commands/commands.ts',
            popup: './src/dialog/index.tsx',
            redirect: './src/auth/redirect.ts',
            diagnostic: './src/auth/diagnostic.ts',
            landing: './src/landing/index.tsx'
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            clean: true
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
            fallback: {
                // 必要的 polyfills（用于 mammoth、pdfjs-dist 等库）
                "buffer": require.resolve("buffer/"),
                "util": require.resolve("util/"),
                "path": require.resolve("path-browserify"),
                // 不需要的 Node.js 核心模块
                "process": false,
                "stream": false,
                "zlib": false,
                "assert": false,
                "crypto": false,
                "os": false,
                "tty": false,
                "fs": false,
                "http": false,
                "https": false,
                "url": false
            }
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.txt$/,
                    type: 'asset/source'
                }
            ]
        },
        plugins: [
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser'
            }),
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || (isProduction ? 'production' : 'development')),
                'process.env.REACT_APP_SHOW_DEBUG': JSON.stringify(process.env.REACT_APP_SHOW_DEBUG || 'false'),
                'process.env.REACT_APP_PUBLIC_URL': JSON.stringify(process.env.REACT_APP_PUBLIC_URL || 'https://wordlayouter.top'),
                'process.env.REACT_APP_API_BASE': JSON.stringify(process.env.REACT_APP_API_BASE || 'https://api.wordlayouter.top'),
                'process.env.REACT_APP_AZURE_CLIENT_ID': JSON.stringify(process.env.REACT_APP_AZURE_CLIENT_ID || ''),
                'process.env.REACT_APP_AZURE_TENANT_ID': JSON.stringify(process.env.REACT_APP_AZURE_TENANT_ID || ''),
                'process.env.REACT_APP_AZURE_SCOPE': JSON.stringify(process.env.REACT_APP_AZURE_SCOPE || ''),
                'DEEPSEEK_API_KEY': JSON.stringify(process.env.DEEPSEEK_API_KEY || ''),
                'DEEPSEEK_API_URL': JSON.stringify(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions')
            }),
            new HtmlWebpackPlugin({
                template: './src/landing/landing.html',
                filename: 'index.html',
                chunks: ['landing']
            }),
            new HtmlWebpackPlugin({
                template: './src/taskpane/taskpane.html',
                filename: 'taskpane.html',
                chunks: ['taskpane']
            }),
            new HtmlWebpackPlugin({
                template: './src/commands/commands.html',
                filename: 'commands.html',
                chunks: ['commands']
            }),
            new HtmlWebpackPlugin({
                template: './src/dialog/popup.html',
                filename: 'popup.html',
                chunks: ['popup']
            }),
            new HtmlWebpackPlugin({
                template: './src/auth/redirect.html',
                filename: 'redirect.html',
                chunks: ['redirect']
            }),
            new HtmlWebpackPlugin({
                template: './src/auth/auth.html',
                filename: 'auth.html',
                chunks: []
            }),
            new HtmlWebpackPlugin({
                template: './src/auth/dialog.html',
                filename: 'dialog.html',
                chunks: []  // 纯静态页面，不需要 JS bundle
            }),
            new HtmlWebpackPlugin({
                template: './src/auth/fallbackAuth.html',
                filename: 'fallbackAuth.html',
                chunks: []  // 使用 CDN 加载 MSAL
            }),
            new HtmlWebpackPlugin({
                template: './src/auth/diagnostic.html',
                filename: 'diagnostic.html',
                chunks: ['diagnostic']  // 使用本地打包的 MSAL
            }),
            new HtmlWebpackPlugin({
                template: './src/auth/office-auth-redirect.html',
                filename: 'office-auth-redirect.html',
                chunks: []  // 纯静态页面，用于 Office 弹窗认证回调
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'assets',
                        to: 'assets',
                        noErrorOnMissing: true
                    },
                    {
                        from: 'manifest.xml',
                        to: 'manifest.xml'
                    },
                    {
                        from: 'msal-test.html',
                        to: 'msal-test.html',
                        noErrorOnMissing: true
                    }
                ]
            })
        ],
        optimization: {
            minimize: isProduction,
            usedExports: true,
            sideEffects: true
        },
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist')
            },
            port: 3000,
            hot: true,
            https: httpsOptions,
            client: {
                webSocketURL: {
                    protocol: 'wss',
                    hostname: 'localhost',
                    port: 3000,
                    pathname: '/ws'
                }
            },
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        },
        devtool: isProduction ? false : 'inline-source-map'
    };
};