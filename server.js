import express from 'express';
import fetch from 'node-fetch';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3000; // Use Replit’s assigned port

app.get('/', (req, res) => {
    res.send('<h2>Server is ready!</h2>');
});

// app.post('/interactions', (req, res) => {
//     res.json({ type: 1 }); // Discord expects this for verification
// });

// app.use('/', createProxyMiddleware({
//     target: 'http://fi10.bot-hosting.net:21993', // Your actual bot server
//     changeOrigin: true,
//     pathRewrite: { '^/bot': '' } // Remove prefix
// }));

//setInterval(() => {
//    fetch(`https://rps-yt25.onrender.com/`)
//        .then(res => console.log('Self-ping successful'))
//        .catch(err => console.error('Self-ping failed', err));
//}, 900000); // 5 minutes


const startServer = () => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server Ready on port ${PORT}`);
    });
};

export { startServer, app , PORT};
