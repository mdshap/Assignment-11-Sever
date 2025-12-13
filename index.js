const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://ScholarshipStream:T6ClGatm1mQQp6cQ@cluster0.blss57h.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Server is Available");
});

async function run() {
  try {
    await client.connect();
    console.log("Connected");

    const db = client.db("ScholarshipStream");

    //USERS COLLECTION RELATED APIs
    const usersCollection = db.collection("Users");
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const users = usersCollection.find();
      const result = await users.toArray();
      res.send(result);
    });

    const scholarshipsCollection = db.collection("Scholarships");
    const applicationsCollection = db.collection("Applications");
    const reviewsCollection = db.collection("Reviews");

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch {
  } finally {
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log("User server is running on port:", port);
});
