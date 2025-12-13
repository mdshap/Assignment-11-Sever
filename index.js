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
    //CONNECT TO MONGODB
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

    app.get("/users/:email", async (req, res)=>{
        const email = req.params.email;
        const user = await usersCollection.findOne({email})
        res.send(user);
    })

    //SCHOLARSHIP RELATED APIs
    const scholarshipsCollection = db.collection("Scholarships");

    //APPLICATION RELATED APIs
    const applicationsCollection = db.collection("Applications");

    //REVIEWS RELATED APIs
    const reviewsCollection = db.collection("Reviews");
  } catch {
  } finally {
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log("User server is running on port:", port);
});
