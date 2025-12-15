const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).send({ message: "Amount is required" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: "usd",
      payment_method_types: ["card"],
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe Error:", error.message);
    res.status(500).send({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Server is Available");
});

async function run() {
  try {
    await client.connect();
    console.log("Connected");

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    const db = client.db("ScholarshipStream");

    //USERS RELATED APIs
    const usersCollection = db.collection("Users");
    app.post("/users", async (req, res) => {
      const newUser = req.body;

      const existingUser = await usersCollection.findOne({
        email: newUser.email,
      });

      if (existingUser) {
        return res.send({
          message: "User already exists",
        });
      }

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const users = usersCollection.find();
      const result = await users.toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send(user);
    });

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const { role } = req.body;

      const updatedRole = {
        $set: { role },
      };
      const result = await usersCollection.updateOne({ email }, updatedRole);
      res.send(result);
    });

    app.delete("/users/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //SCHOLARSHIP RELATED APIs
    const scholarshipsCollection = db.collection("Scholarships");
    app.post("/scholarships", async (req, res) => {
      const newScholarship = req.body;
      newScholarship.createdAt = new Date();
      const result = await scholarshipsCollection.insertOne(newScholarship);
      res.send(result);
    });

    app.get("/scholarships", async (req, res) => {
      const { search, category, order } = req.query;
      const query = {};

      if (search) {
        query.$or = [
          { scholarshipName: { $regex: search, $options: "i" } },
          { universityName: { $regex: search, $options: "i" } },
          { degree: { $regex: search, $options: "i" } },
        ];
      }

      if (category) {
        query.scholarshipCategory = category;
      }

      const filteredScholarships = scholarshipsCollection.find(query);
      const result = await filteredScholarships.toArray();

      if (order === "ascending") {
        result.sort(
          (a, b) => Number(a.applicationFees) - Number(b.applicationFees)
        );
      } else if (order === "descending") {
        result.sort(
          (a, b) => Number(b.applicationFees) - Number(a.applicationFees)
        );
      }
      res.send(result);
    });

    app.get("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const filteredScholarship = await scholarshipsCollection.findOne(query);
      res.send(filteredScholarship);
    });

    app.patch("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: updatedData,
      };

      const result = await scholarshipsCollection.updateOne(filter, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Scholarship not found" });
      }

      res.send(result);
    });

    app.delete("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const result = await scholarshipsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    //APPLICATION RELATED APIs
    const applicationsCollection = db.collection("Applications");
    app.post("/applications", async (req, res) => {
      try {
        const application = req.body;

        if (
          !application.scholarshipId ||
          !application.userId ||
          !application.userEmail
        ) {
          return res.status(400).send({ message: "Invalid application data" });
        }

        const newApplication = {
          scholarshipId: application.scholarshipId,
          scholarshipName: application.scholarshipName,

          userId: application.userId,
          userName: application.userName,
          userEmail: application.userEmail,

          universityName: application.universityName,
          universityCity: application.universityCity,
          universityCountry: application.universityCountry,

          scholarshipCategory: application.scholarshipCategory,
          degree: application.degree,

          applicationFees: application.applicationFees,
          serviceCharge: application.serviceCharge,

          applicationStatus: "pending",
          paymentStatus: application.paymentStatus || "UNPAID",

          applicationDate: new Date(),
          feedback: "",
        };

        const result = await applicationsCollection.insertOne(newApplication);

        res.send({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get("/applications", async (req, res) => {
      const applications = applicationsCollection.find();
      const result = await applications.toArray();
      res.send(result);
    });

    app.get("/applications/:userID", async (req, res) => {
      const userID = req.params.userID;
      const query = { userId: userID };
      const filteredApplication = applicationsCollection.find(query);
      const result = await filteredApplication.toArray();
      res.send(result);
    });

    app.delete("/applications/:id", async (req, res) => {
      const id = req.params.id;

      const result = await applicationsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    app.patch("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const { userName, userEmail } = req.body;

      const result = await applicationsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            userName,
            userEmail,
          },
        }
      );

      res.send(result);
    });

    //REVIEWS RELATED APIs
    const reviewsCollection = db.collection("Reviews");

    app.post("/reviews", async (req, res) => {
      const review = req.body;

      const newReview = {
        applicationId: review.applicationId,
        scholarshipId: review.scholarshipId,
        scholarshipName: review.scholarshipName,

        universityName: review.universityName,
        universityCity: review.universityCity,
        universityCountry: review.universityCountry,

        userId: review.userId,
        userName: review.userName,
        userEmail: review.userEmail,
        userImage: review.userImage,

        ratingPoint: review.rating,
        reviewComment: review.comment,

        reviewDate: new Date(),
      };

      const result = await reviewsCollection.insertOne(newReview);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const reviews = await reviewsCollection.find().toArray();
      res.send(reviews);
    });

    app.get("/reviews/:userID", async (req, res) => {
      const userId = req.params.userID;

      const reviews = await reviewsCollection.find({ userId }).toArray();

      res.send(reviews);
    });

    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;

      const result = await reviewsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    app.patch("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const { ratingPoint, reviewComment } = req.body;

      const result = await reviewsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ratingPoint,
            reviewComment,
            reviewDate: new Date(),
          },
        }
      );

      res.send(result);
    });
    
  } catch {
  } finally {
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log("User server is running on port:", port);
});
