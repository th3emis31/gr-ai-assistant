const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{
  res.send("GR AI Server Running");
});

const API_KEY = process.env.OPENAI_API_KEY;

app.post("/chat", async (req, res) => {

try {

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

} catch(error){

console.error(error);

res.json({
reply:"Sorry, I am having connection issues right now."
});

}

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
console.log("AI server running on port " + PORT);
});
