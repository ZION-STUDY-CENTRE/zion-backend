const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  token: { 
    type: String, 
    required: true 
  },
  expires: { 
    type: Date, 
    required: true 
  },
  created: { 
    type: Date, 
    default: Date.now 
  },
  revoked: { 
    type: Date 
  },
  replacedByToken: { 
    type: String 
  }
});

RefreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= this.expires;
});

RefreshTokenSchema.virtual('isActive').get(function () {
  return !this.revoked && !this.isExpired;
});

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
