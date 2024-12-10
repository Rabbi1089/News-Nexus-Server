const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.port || 5000;
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.t241ufd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //  await client.connect();
    // Send a ping to confirm a successful connection

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const articleCollections = client.db("nexusDb").collection("article");
    const userCollections = client.db("nexusDb").collection("user");

        //jwt
        app.post("/jwt", async (req, res) => {
          const user = req.body;
          const token = jwt.sign(user, process.env.token_secret, {
            expiresIn: "1h",
          });
          res.send({ token });
        });
    
        //middleware
        const verifyToken = (req, res, next) => {
          if (!req.headers.authorization) {
            return res.status(401).send({ message: "Unauthorized  access" });
          }
          const token = req.headers.authorization.split(" ")[1];
          // verify a token 
          jwt.verify(token, process.env.token_secret, (err, decoded) => {
            if (err) {
              return res.status(401).send({ message: "Unauthorized access" });
            }
            req.decoded = decoded;
            next();
          });
        };
    

//article related api 
    app.post('/article', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await articleCollections.insertOne(item)
      console.log(result);
      res.send(result)
    })

        //user related api
        app.get("/article",verifyToken, async (req, res) => {
          const result = await articleCollections.find().toArray();
          res.send(result);
          console.log(result);
        });


      //user related api

      app.post("/user", async (req, res) => {
        const user = req.body;
        console.log(user);
        const query = { email: user.email };
        const isExists = await userCollections.findOne(query);
        if (isExists) {
          return res.send({
            message: "user already exists",
            insertId: null,
          });
        }
        const result = await userCollections.insertOne(user);

        res.send(result);
      });

      app.get("/user",  async (req, res) => {
        const result = await userCollections.find().toArray();
        res.send(result);
      });
  

  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("nexus loading");
});

app.listen(port, () => {
  console.log(`nexus on ${port}`);
});
