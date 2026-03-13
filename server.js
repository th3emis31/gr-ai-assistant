const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.options("*", cors());
app.use(express.json({ limit: "1mb" }));


// Health check
app.get("/", (req, res) => {
  res.send("GR AI Server Running");
});

// OpenAI key
const API_KEY = process.env.OPENAI_API_KEY;

// Chat endpoint
app.post("/chat", async (req, res) => {

  try {

    const userMessage = req.body.message;

    if (!userMessage) {
      return res.json({
        reply: "Please type a message."
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are the AI assistant for GR Maintenance Ltd in London.

Your job is to help customers with:
- home refurbishment
- building work
- decorating
- property maintenance
- repairs
- renovation advice

Be professional, friendly and helpful.
Encourage customers to request a quote when appropriate.
`
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      console.error("OpenAI error:", data);
      return res.json({
        reply: "Sorry, something went wrong. Please try again."
      });
    }

    res.json({
      reply: data.choices[0].message.content
    });

  } catch (error) {

    console.error("Server error:", error);

    res.json({
      reply: "Sorry, I am having connection issues right now."
    });

  }

});

// Server port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("AI server running on port " + PORT);
});

