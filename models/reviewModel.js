const mongoose = require("mongoose");
const tour = require("./tourModel");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"]
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },

    createAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour."]
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Reviews must belong to a user."]
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Ensures the combination of tour and user is 1-1
// Avoids duplicate reviews
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  //   this.populate({
  //     path: "tour",
  //     select: "name",
  //   }).populate({
  //     path: "user",
  //     select: "name photo",
  //   });
  this.populate({
    path: "user",
    select: "name photo"
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function(tour) {
  const stats = await this.aggregate([
    {
      $match: { tour }
    },
    {
      $group: {
        _id: "$tour", // group all tours together by tour
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5 // Default when there are not review at all
    });
  }
};

//findIdAndUpdate
//findByIdAndDelete
reviewSchema.post("save", function(next) {
  // Points to current review
  this.constructor.calcAverageRatings(this.tour);
  next();
});

reviewSchema.pre(/^findOneAnd/, async function(next) {
  const r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function(next) {
  //await this.findOne() does NOT work here, query has already executed
  await this.r.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
