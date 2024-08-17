const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    'https://resonant-bonbon-f6dc6a.netlify.app',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
  optionSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s6poe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    console.log('Connected to MongoDB');

    const userCollection = client.db('dreamBuy').collection('user');
    const productCollection = client.db('dreamBuy').collection('product');
    const bannerCollection = client.db('dreamBuy').collection('banner');
    const orderCollection = client.db('dreamBuy').collection('order');

    // JWT API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      res.send({ token });
    });

    // Middleware to verify token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Middleware to verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email });
      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      next();
    };

    // Admin API
    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorized access' });
      }

      const user = await userCollection.findOne({ email });
      const admin = user?.role === 'admin';
      res.send({ admin });
    });

    // User APIs
    app.get('/user', verifyToken, async (req, res) => {
      const user = await userCollection.find().toArray();
      res.send(user);
    });

    // Get a single user by ID
    app.get('/user/:id', async (req, res) => {
      const id = req.params.id;
      const user = await userCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(user);
    });

    // Get a user by email
    app.get('/user/email/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.find({ email }).toArray();
      res.send(user);
    });

    // Create a new user
    app.post('/user', async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    // Update user data
    app.put('/user/:email', async (req, res) => {
      const { email } = req.params;
      const updatedData = req.body;
      try {
        const result = await userCollection.updateOne(
          { email },
          { $set: updatedData }
        );
        if (result.modifiedCount > 0) {
          const updatedUser = await userCollection.findOne({ email });
          res.send(updatedUser);
        } else {
          res
            .status(404)
            .send({ message: 'User not found or no change in data' });
        }
      } catch (error) {
        res.status(500).send({ error: 'Failed to update user' });
      }
    });

    // Product APIs
    app.get('/product', async (req, res) => {
      const product = await productCollection.find().toArray();
      res.send(product);
    });

    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const product = await productCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(product);
    });

    // Order APIs
    app.get('/order', async (req, res) => {
      const order = await orderCollection.find().toArray();
      res.send(order);
    });

    app.get('/order/:email', async (req, res) => {
      const email = req.params.email;
      const order = await orderCollection.find({ email }).toArray();
      res.send(order);
    });

    app.post('/order', async (req, res) => {
      const newOrder = req.body;
      const result = await orderCollection.insertOne(newOrder);
      res.send(result);
    });

    // Banner APIs
    app.get('/banner', async (req, res) => {
      const banner = await bannerCollection.find().toArray();
      res.send(banner);
    });

    app.get('/banner/:id', async (req, res) => {
      const id = req.params.id;
      const banner = await bannerCollection.findOne({ _id: new ObjectId(id) });
      res.send(banner);
    });

    // Ping MongoDB
    // await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Uncomment the following line if you want to close the connection after every request
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('BD Shop server is running');
});

app.listen(port, () => console.log(`Server running on port ${port}`));
