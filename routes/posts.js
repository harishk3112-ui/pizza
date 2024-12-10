const express = require('express');
const Post = require('../models/Post');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied. No token provided.');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
  }
}

// Create a post
router.post('/', verifyToken, async (req, res) => {
  const { title, topic, body, expiration } = req.body;

  try {
    const newPost = new Post({
      title,
      topic,
      body,
      expiration,
      owner: req.user.id
    });
    await newPost.save();
    res.status(201).send('Post created successfully');
  } catch (err) {
    res.status(500).send('Error creating post');
  }
});

// Browse posts by topic
router.get('/:topic', async (req, res) => {
  try {
      const posts = await Post.find({ topic: { $in: [req.params.topic] } }); // Correctly handles arrays
      res.status(200).json(posts);
  } catch (err) {
      console.error('Error fetching posts:', err);
      res.status(500).send('Error fetching posts');
  }
});



// Like a post
router.post('/:postId/like', verifyToken, async (req, res) => {
  try {
      // Fetch the post by ID
      const post = await Post.findById(req.params.postId);
      if (!post) return res.status(404).send('Post not found');

      // Check if the user trying to like the post is the owner
      if (post.owner.toString() === req.user.id) {
          return res.status(403).send('You cannot like your own post');
      }

      // Increment likes
      post.likes += 1;
      await post.save();

      res.send('Post liked successfully');
  } catch (err) {
      console.error('Error liking post:', err);
      res.status(500).send('Error liking post');
  }
});

// Dislike a post
router.post('/:postId/dislike', verifyToken, async (req, res) => {
  try {
      // Fetch the post by ID
      const post = await Post.findById(req.params.postId);
      if (!post) return res.status(404).send('Post not found');

      // Check if the post is expired
      const currentTime = new Date();
      if (currentTime > new Date(post.expiration)) {
          return res.status(403).send('Cannot dislike an expired post');
      }

      // Increment dislikes
      post.dislikes += 1;
      await post.save();

      res.send('Post disliked successfully');
  } catch (err) {
      console.error('Error disliking post:', err);
      res.status(500).send('Error disliking post');
  }
});


// Comment on a post
router.post('/:postId/comment', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).send('Post not found');

    const comment = { user: req.user.id, text: req.body.comment };
    post.comments.push(comment);
    await post.save();
    res.send('Comment added successfully');
  } catch (err) {
    res.status(500).send('Error adding comment');
  }
});

// Query expired posts
router.get('/expired/:topic', verifyToken, async (req, res) => {
  try {
      const currentTime = new Date();

      // Find all expired posts for the requested topic
      const expiredPosts = await Post.find({
          topic: { $in: [req.params.topic] },
          expiration: { $lt: currentTime } // Expired posts filter
      });

      res.status(200).json(expiredPosts);
  } catch (err) {
      console.error('Error fetching expired posts:', err);
      res.status(500).send('Error fetching expired posts');
  }
});


// Get most active post
router.get('/most-active/:topic', verifyToken, async (req, res) => {
  try {
      const currentTime = new Date();

      // Find the active post in the requested topic with the highest interest (likes + dislikes)
      const mostActivePost = await Post.find({
          topic: { $in: [req.params.topic] },
          expiration: { $gte: currentTime } // Only active posts
      })
          .sort({ likes: -1, dislikes: -1 }) // Sort by likes and dislikes
          .limit(1); // Return the post with the highest interest

      if (mostActivePost.length === 0) {
          return res.status(404).send('No active posts found for this topic');
      }

      res.status(200).json(mostActivePost[0]);
  } catch (err) {
      console.error('Error fetching most active post:', err);
      res.status(500).send('Error fetching most active post');
  }
});


module.exports = router;
