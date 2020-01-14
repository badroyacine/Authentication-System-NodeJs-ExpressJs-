const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "name is required"],
  },
  email: {
    type: String,
    required: [true, "Message en cas d'erreur"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function(el){
        //works only on CREATE or SAVE
        return el === this.password;
      },
      message: "passwowrd and passwordConfirm do not match"
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password at creation or modification of the password
userSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function(condidatePassword, userPassword) {
  return await bcrypt.compare(condidatePassword, userPassword);
}

userSchema.methods.createPasswordResetToken = function(){
  // Generate Token
  const resetToken = crypto.randomBytes(32).toString('hex');
  // Hash token and and set to passwordResetToken
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // expires in 10 minutes.
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; 

  //return non crypted token
  return resetToken;
};


const User = mongoose.model('User', userSchema);
module.exports = User;