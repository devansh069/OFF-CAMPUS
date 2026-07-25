const axios = require('axios');
const User = require('../models/User');
const College = require('../models/College');

exports.exchangeCode = async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    const userId = req.userId; // Populated by authMiddleware

    if (!code || !redirectUri) {
      return res.status(400).json({ detail: 'Authorization code and redirect URI are required.' });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[Spotify] Client ID or Client Secret is missing in environment variables.');
      return res.status(500).json({ detail: 'Spotify integration is not configured on the server.' });
    }

    console.log('[Spotify] Exchanging code for user:', userId);

    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
        }
      }
    );

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      return res.status(400).json({ detail: 'Failed to obtain access token from Spotify.' });
    }

    // 2. Fetch top tracks
    console.log('[Spotify] Fetching top tracks...');
    const tracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=5', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const topTracks = (tracksResponse.data.items || []).map(track => {
      const artistNames = (track.artists || []).map(a => a.name).join(', ');
      return `${track.name} - ${artistNames}`;
    });

    // 3. Fetch top artists
    console.log('[Spotify] Fetching top artists...');
    const artistsResponse = await axios.get('https://api.spotify.com/v1/me/top/artists?limit=5', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const topArtists = (artistsResponse.data.items || []).map(artist => artist.name);

    // 4. Update User record in database
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User profile not found.' });
    }

    user.spotify_data = {
      top_tracks: topTracks,
      top_artists: topArtists
    };

    // Vibe score bonus (+0.2, capped at 5.0)
    user.vibe_score = Math.min(5.0, user.vibe_score + 0.2);
    await user.save();

    // Fetch updated user with college info
    const fullUser = await User.findOne({
      where: { user_id: userId },
      include: [{ model: College, as: 'college' }]
    });

    console.log('[Spotify] Successfully synced Spotify data for user:', userId);

    return res.status(200).json({
      user: fullUser || user,
      message: 'Spotify data integrated successfully!'
    });

  } catch (error) {
    console.error('[Spotify Integration Error]:', error.response ? error.response.data : error.message);
    const detail = error.response && error.response.data && error.response.data.error_description
      ? error.response.data.error_description
      : error.message;
    return res.status(500).json({ detail: 'Spotify synchronization failed: ' + detail });
  }
};
