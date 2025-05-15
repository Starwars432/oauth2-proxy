const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors());

// Decap CMS hits this route: /api/auth?provider=github&scope=repo
app.get('/api/auth', (req, res) => {
  const { provider, scope } = req.query;

  if (provider !== 'github') {
    return res.status(400).send('Unsupported provider');
  }

  const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URL}&scope=${scope || 'repo'}`;

  res.redirect(redirectUrl);
});

// GitHub redirects here with a temporary code after user auths
app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URL,
      },
      {
        headers: { accept: 'application/json' },
      }
    );

    const accessToken = response.data.access_token;

    // ✅ Redirect back to your MAIN website domain, NOT the proxy
    const returnUrl = `https://manifestillusions.com/vos?token=${accessToken}`;
    res.redirect(returnUrl);
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`OAuth proxy running on port ${PORT}`);
});
