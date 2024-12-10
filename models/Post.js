const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topic: { type: [String], required: true },
  body: { type: String, required: true },
  expiration: { type: Date, required: true },
  owner: { type: String, required: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  comments: [{ user: String, comment: String }],
});

module.exports = mongoose.model('Post', postSchema);
