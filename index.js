const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

//middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://news-nexus-25.netlify.app",
    "https://nexus-news-7e6c7.web.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

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
    const publisherCollections = client.db("nexusDb").collection("publisher");

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
    app.post("/article", async (req, res) => {
      const item = req.body;
      const result = await articleCollections.insertOne(item);
      res.send(result);
    });

    //user related api
    app.get("/article", async (req, res) => {
      const result = await articleCollections.find().toArray();
      res.send(result);
    });

    app.get("/approveAticles", async (req, res) => {
      const query = {
        status: "approve",
      };
      const result = await articleCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/allTag", async (req, res) => {
      const query = {
        status: "approve",
      };
      const result = await articleCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/article/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollections.findOne(query);
      res.send(result);
      console.log(result);
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
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

    app.get("/user", async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });

    app.patch("/user/admin/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollections.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.send.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollections.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollections.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.patch(
      "/admin/article/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const status = req.body.status;
        const declineMessage = req.body.declineMessage;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: status,
            declineMessage: declineMessage,
          },
        };
        const result = await articleCollections.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    app.patch(
      "/admin/premium/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            premium: true,
          },
        };
        const result = await articleCollections.updateOne(query, updateDoc);

        res.send(result);
      }
    );

    app.delete(
      "/admin/article/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await articleCollections.deleteOne(query);

        res.send(result);
      }
    );

    //publiser related api
    app.post("/publisher", async (req, res) => {
      const item = req.body;
      const result = await publisherCollections.insertOne(item);
      res.send(result);
    });
    app.get("/publisher", async (req, res) => {
      const result = await publisherCollections.find().toArray();
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
