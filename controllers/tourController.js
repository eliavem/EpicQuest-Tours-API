const Tour = require("./../models/tourModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");
const APIFeatures = require("./../utils/apiFeatures");


exports.aliasTopTours = (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  next();
};

// exports.getAllTours = factory.getAll(Tour);

// exports.getTour = factory.getOne(Tour, { path: "reviews" });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate('reviews');

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  const tourObject = tour.toObject();

  // Construct URL for cover image
  tourObject.imageCover = `${req.protocol}://${req.get('host')}/img/tours/${tourObject.imageCover}`;
  
  // Construct URLs for all images in the images array
  tourObject.images = tourObject.images.map(image => 
    `${req.protocol}://${req.get('host')}/img/tours/${image}`
  );
  
  // Handle guide photos if needed
  if (tourObject.guides) {
    tourObject.guides = tourObject.guides.map(guide => ({
      ...guide,
      photo: guide.photo ? `${req.protocol}://${req.get('host')}/img/users/${guide.photo}` : null
    }));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: tourObject
    }
  });
});

exports.getAllTours = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;

  const toursWithUrls = tours.map(tour => {
    const tourObject = tour.toObject();
    
    // Construct URL for cover image
    tourObject.imageCover = `${req.protocol}://${req.get('host')}/img/tours/${tourObject.imageCover}`;
    
    // Construct URLs for all images in the images array
    tourObject.images = tourObject.images.map(image => 
      `${req.protocol}://${req.get('host')}/img/tours/${image}`
    );
    
    // Handle guide photos if needed
    if (tourObject.guides) {
      tourObject.guides = tourObject.guides.map(guide => ({
        ...guide,
        photo: guide.photo ? `${req.protocol}://${req.get('host')}/img/users/${guide.photo}` : null
      }));
    }
    
    return tourObject;
  });

  res.status(200).json({
    status: 'success',
    results: toursWithUrls.length,
    data: {
      data: toursWithUrls
    }
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: "$difficulty" },
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates"
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" }
      }
    },
    {
      $addFields: { month: "$_id" }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: "success",
    data: {
      plan
    }
  });
});

///tours-within/:distance/center/:latlng/unit/:unit
// tours-within/233/center/-40,45/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  console.log(radius);

  if (!lat || !lng) {
    next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400
      )
    );
  }

  const distance = await Tour.aggregate([
    {
      $geoNear: {
        // Opeates on an index. If multiple fields are indexed, it will use the first one
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1] // * 1 to convert string to number
        },
        distanceField: "distance",
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: "success",
    data: {
      data: distance
    }
  });
});
