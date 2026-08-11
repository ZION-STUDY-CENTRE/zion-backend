require("dotenv").config();
const mongoose = require("mongoose");
const BlogPost = require("./models/BlogPost");

const postData = {
  type: "upcoming-event",
  department: "Computer Diploma",
  title: "Backdated Blog Post Example",
  description:
    "<p>This is a backdated blog post created for July 30, 2023.</p>",
  shortDescription: "Backdated blog post created as a one-time entry.",
  image: "https://example.com/your-image.jpg",
  timestamp: new Date("2023-07-30T08:00:00Z"),
};

async function main() {
  if (!process.env.MONGO_URI) {
    console.error(
      "Missing MONGO_URI in environment. Please set it in .env or your shell.",
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const post = new BlogPost(postData);
    const saved = await post.save();
    console.log("Blog post created successfully.");
    console.log("ID:", saved._id.toString());
    console.log("Timestamp:", saved.timestamp.toISOString());
    process.exit(0);
  } catch (error) {
    console.error("Failed to create blog post:", error);
    process.exit(1);
  }
}

main();
