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
            commands: './src/commands/commands.ts'
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
                'process.env.REACT_APP_PUBLIC_URL': JSON.stringify(process.env.REACT_APP_PUBLIC_URL || 'https://wordlayouter.top')
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
                        from: 'sitemap.xml',
                        to: 'sitemap.xml'
                    },
                    {
                        from: 'robots.txt',
                        to: 'robots.txt'
                    },
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