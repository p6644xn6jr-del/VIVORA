const express = require("express");

const router = express.Router();

router.get("/uses", (req, res) => {
  return res.status(200).json([
    { id: 1, display_name: "テストユーザー1", email: "test1@example.com" },
    { id: 2, display_name: "テストユーザー2", email: "test2@example.com" },
    { id: 3, display_name: "テストユーザー3", email: "test3@example.com" },
    { id: 4, display_name: "テストユーザー4", email: "test4@example.com" },
    { id: 5, display_name: "テストユーザー5", email: "test5@example.com" }
  ]);
});

module.exports = router;
