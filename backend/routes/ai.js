import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

router.post("/subtasks", async (req, res) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const { title, description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "Missing input" });
  }

  try {
    const prompt = `
      You are a productivity assistant.

      Break this task into at most 3 subtasks.

      Rules:
      - Max 3 subtasks
      - Each subtask must include EXACTLY ONE time estimate
      - Time format MUST be:
        - "<number> min" OR "<number> hr"
      - DO NOT return ranges
      - DO NOT explain anything
      - Output JSON only

      Task: ${title}
      Description: ${description || "None"}

      Example:
      [
        { "name": "Research topic", "est": "30 min" },
        { "name": "Write draft", "est": "2 hr" }
      ]

      Now return result:
    `;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = response.choices[0].message.content;
    const match = text.match(/\[[\s\S]*\]/);

    let parsed = [];
    try {
      parsed = match ? JSON.parse(match[0]) : [];
    } catch (e) {
      console.error("JSON parse failed:", e);
    }

    function cleanEstimate(est) {
      if (!est) return "30 min";
      if (est.includes("-")) {
        const [min, max] = est.split("-").map(s => parseInt(s));
        return Math.round((min + max) / 2) + " min";
      }
      return est;
    }

    parsed = parsed.map(item => ({
      ...item,
      est: cleanEstimate(item.est || "")
    }));

    if (!parsed.length) {
      return res.json([
        { name: "Research & planning", est: "30 min" },
        { name: "Implementation", est: "2 hr" },
        { name: "Review & refine", est: "1 hr" },
      ]);
    }

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});

export default router;
