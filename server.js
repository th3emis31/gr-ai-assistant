const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const API_KEY = process.env.OPENAI_API_KEY;

app.post("/chat", async (req, res) => {

const userMessage = req.body.message;

const response = await fetch("https://api.openai.com/v1/chat/completions",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":`Bearer ${API_KEY}`
},
body:JSON.stringify({
model:"gpt-4o-mini",
messages:[
{
role:"system",
content:"You are the AI assistant for GR Maintenance Ltd in London. Help customers with refurbishment, building, decorating, repairs and maintenance services."
},
{
role:"user",
content:userMessage
}
]
})
});

const data = await response.json();

res.json({
reply:data.choices[0].message.content
});

});

app.listen(3000, ()=>{
console.log("AI server running on port 3000");
});
