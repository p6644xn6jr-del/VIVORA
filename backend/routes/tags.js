const express = require("express");
const {createClient} = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const router = express.Router();



router.get("/",　async (req, res) => {
    const { sort } = req.query;

    const {data, error} = await supabase
.from("posts")
.select("tags");
if (error) {
    return res.status(500).json({error: "タグの取得に失敗しました"});
}
const tagCounts ={};

data.forEach((post) => {
  (post.tags || []).forEach((tag) => {
  if (tag === "こだわり") return;

  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
});
});

  let sortedTags = Object.entries(tagCounts).map(([name, postCount]) => ({ name: "#" + name,postCount}));
    if (sort === "popular") {
        sortedTags.sort((a, b) => b.postCount - a.postCount);
    }
    res.json(sortedTags);
});
module.exports = router;