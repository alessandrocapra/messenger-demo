import express from "express";
const port = process.env.PORT;

const app = express();

app.get("/", (_req, res) => {
  res.send({ message: "test" });
})

app.listen(port, () => console.log(`Server is running on port ${port}`));
