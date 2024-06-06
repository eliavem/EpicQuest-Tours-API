const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"]
  },
  email: {
    type: String,
    required: [true, "Please provide your email!"],
    unique: true,
    isLowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"]
  },
  photo: String,
  password: {
    type: String,
    required: [true, "Please provide a password!"],
    minLength: 8
  },
  passwordConfirm: {
    type: String,
    requried: [true, "Please confirm your password!"],
    validate: {
      // This only works on CREATE and SAVE
      validator: function(el) {
        return el === this.password;
      },
      message: "passwords are not the same!"
    }
  }
});

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  // After validation is successful, we do not want to persist
  // this field to the database
  this.passwordConfirm = undefined;
  next();
});
const User = mongoose.model("User", userSchema);

module.exports = User;
