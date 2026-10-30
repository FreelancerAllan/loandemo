export default async function handler(req, res) {
  if (req.method === "POST") {
    console.log("M-Pesa Callback:", JSON.stringify(req.body, null, 2));
    // You can save the result to a database here later
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
  return res.status(405).json({ error: "Method not allowed" });
}